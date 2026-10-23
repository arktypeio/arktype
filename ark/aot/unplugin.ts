import { throwError, type KeySet } from "@ark/util"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { basename, dirname, isAbsolute, join, resolve } from "node:path"
import { relative } from "node:path/posix"
import { createUnplugin, type UnpluginInstance } from "unplugin"
import {
	emitDeclarations,
	refuseDeclare,
	writeDeclaredOutsideMessage,
	type Declarations
} from "./declare.ts"
import type {
	PrecompilePluginOptions,
	PrecompileRequest,
	RenderedDiagnostics,
	TransformedModule
} from "./driver.ts"
import {
	allowUnsafeHint,
	appendSourceMap,
	createDevelopmentHost,
	createNodeHost,
	dependencyOf,
	fileOf,
	optedInPackagesOf,
	precompiledDependencyOf,
	packageNameOf,
	realPathOf,
	reportDiagnostics,
	readsNodes,
	resolvesToRuntime,
	resolvedVariantOf,
	rethrowAsBuildError,
	runtimePackages,
	runtimeSpecifiers,
	schemaSpecifier,
	throwBuildError,
	transformedFilterOf,
	unbundledMessage,
	variantSpecifierOf,
	writePrecompiledDependencyMessage,
	writeExternalizedMessage,
	writeUncachedModuleMessage,
	writeUnwrittenModuleMessage,
	writeVariantImportMessage,
	writeUntransformedImportMessage,
	type PrecompileHost
} from "./host.ts"
import type { ScannedProgram, ScannedUsage } from "./precompile.ts"
import { withEnvironment, type Environment } from "./presets.ts"
import {
	scanProgram,
	unseenProblemOf,
	type ImportKind,
	type Imports,
	type ScanEntry
} from "./scan.ts"
import { resolvePrecompileOptions, withSettingsFile } from "./settings.ts"
import { createAsyncPrecompiler } from "./worker.ts"

export type { PrecompilePluginOptions } from "./driver.ts"

export interface PrecompileUnpluginOptions extends PrecompilePluginOptions {
	// emit declarations with a build that neither watches nor serves
	declare?: boolean | undefined
}

export const precompile: UnpluginInstance<
	PrecompileUnpluginOptions | undefined,
	false
> = createUnplugin((opts, meta) => {
	if (!(meta.framework in declaringFrameworks))
		refuseDeclare(opts, meta.framework)
	// Rollup's mark of a virtual module, which esbuild prints as a NUL
	const virtual = meta.framework === "esbuild" ? "" : "\0"
	const given = opts
	// the worker applies the preset, after the environment's defaults, which a
	// bundler says once it has read its own configuration
	let set = withSettingsFile(given)
	opts = resolvePrecompileOptions(set)
	let environment: Environment | undefined
	let workerOptions = set
	// a worker of its own lets arktype take the program's configuration
	const create = () =>
		createAsyncPrecompiler({ precompilerOptions: workerOptions })
	let precompiler = Promise.resolve(create())
	const request = (...message: PrecompileRequest) =>
		precompiler.then(send => send(...message)).catch(rethrowAsBuildError)
	const replace = (send: ReturnType<typeof create>) => {
		void send("close")
		return create()
	}
	const restart = () => {
		precompiler = precompiler.then(replace)
	}
	const updateWorker = () => {
		const updated = environment ? withEnvironment(set, environment) : set
		if (JSON.stringify(updated) === JSON.stringify(workerOptions)) return
		workerOptions = updated
		restart()
	}
	// known once the bundler has read its own configuration
	const setEnvironment = (bundlerEnvironment: Environment) => {
		environment = bundlerEnvironment
		updateWorker()
	}
	// a changed file or configuration may need a new worker
	const reset = () => {
		precompiler = precompiler.then(async send =>
			// a config the worker can't read is reported at the next transform
			(await send("reset").catch(() => false)) ? replace(send) : send
		)
	}
	const readDependency = (importer: string) =>
		request("readDependency", fileOf(importer)) as Promise<RenderedDiagnostics>
	let productionHost = createNodeHost(opts)
	let developmentHost: PrecompileHost | undefined
	// resolves as the bundler's mode would, e.g. arktype/runtime in development
	let host = productionHost
	let isDevelopment = false
	const resolveIn = (isBundlerDevelopment: boolean) => {
		isDevelopment = isBundlerDevelopment
		host =
			isDevelopment ?
				(developmentHost ??= createDevelopmentHost(opts))
			:	productionHost
	}
	let isStandalone = opts?.runtime !== "arktype"
	// a production bundle leaves out what no read of it needs, as does any
	// with prune: true
	const prunesIn = (production: boolean) =>
		isStandalone &&
		!opts?.shadow &&
		(opts?.prune === true || (production && opts?.prune !== false))
	let variant = resolvedVariantOf(opts)
	let packages = optedInPackagesOf(opts?.cwd ?? process.cwd())
	// arktype left to Node loads as itself, not as the runtime validators use
	let inlined = isStandalone ? [...runtimePackages, ...packages] : packages
	// the transform hook's filter, read once the bundler's root is set
	const transformedFilter = transformedFilterOf(packages)
	// ark.json and the packages that opt in are found from the bundler's root,
	// e.g. Vite's, unless `cwd` is set
	const setRoot = (root: string) => {
		if (given?.cwd !== undefined || root === (set.cwd ?? process.cwd())) return
		set = withSettingsFile({ ...given, cwd: root })
		opts = resolvePrecompileOptions(set)
		productionHost = createNodeHost(opts)
		developmentHost = undefined
		resolveIn(isDevelopment)
		isStandalone = opts.runtime !== "arktype"
		variant = resolvedVariantOf(opts)
		packages = optedInPackagesOf(root)
		inlined = isStandalone ? [...runtimePackages, ...packages] : packages
		Object.assign(transformedFilter, transformedFilterOf(packages))
		updateWorker()
	}
	const modules: Record<string, string> = {}
	const importersById: Record<string, string> = {}
	// a persistent cache keeps a transformed module, but not the modules it wrote
	let compiler: BundlerCompiler | undefined
	let storeDir: string | undefined
	// read once the bundler has applied its defaults
	const storeDirOf = () => {
		if (storeDir === undefined && compiler) {
			storeDir = storeDirIn(compiler.options.cache)
			if (storeDir) mkdirSync(storeDir, { recursive: true })
		}
		return storeDir
	}
	// an external arktype loads apart from the runtime its validators use
	const checkExternal = (
		isExternal: (specifier: string) => boolean,
		option: string,
		warn: (message: string) => void
	) => {
		if (!isStandalone || opts?.shadow) return
		const specifier = externalizableSpecifiers.find(isExternal)
		if (!specifier) return
		const problem = writeExternalizedMessage(specifier, option)
		if (opts?.allowUnsafe) warn(problem)
		else throwBuildError(`${problem} ${allowUnsafeHint}`)
	}
	const checkInputExternal = function (
		this: { warn: (message: string) => void },
		options: { external?: unknown }
	) {
		checkExternal(
			specifier => isExternalIn(options.external, specifier),
			"external",
			message => this.warn(message)
		)
	}
	const keepCompiler = (bundler: BundlerCompiler) => {
		compiler = bundler
		resolveIn(bundler.options.mode === "development")
		// a persistent cache keeps what other options precompiled, e.g. before
		// ark.json changed, so they version it
		const { cache } = bundler.options
		if (cache && typeof cache === "object") {
			const version = `arktype ${JSON.stringify(set)}`
			cache.version = cache.version ? `${cache.version} ${version}` : version
		}
		// webpack and Rspack decide externals, e.g. Next's, before resolving
		bundler.hooks.compilation.tap("arktype", compilation =>
			compilation.hooks.finishModules.tap("arktype", modules => {
				const requests = new Set<string>()
				for (const module of modules) {
					if (module instanceof bundler.webpack.ExternalModule)
						requests.add(module.userRequest)
				}
				try {
					checkExternal(
						specifier => requests.has(specifier),
						"externals",
						message =>
							compilation.warnings.push(
								new bundler.webpack.WebpackError(message)
							)
					)
				} catch (e) {
					compilation.errors.push(
						new bundler.webpack.WebpackError((e as Error).message)
					)
				}
			})
		)
	}
	const loadModule = (id: string) => {
		if (id in modules) return modules[id]
		const dir = storeDirOf()
		if (!dir) return throwBuildError(writeUnwrittenModuleMessage(id.slice(1)))
		let stored: [importer: string, code: string]
		try {
			stored = JSON.parse(readFileSync(join(dir, storedNameOf(id)), "utf8"))
		} catch {
			return throwBuildError(writeUncachedModuleMessage(id.slice(1), dir))
		}
		importersById[id] = stored[0]
		return (modules[id] = stored[1])
	}
	// what may throw at runtime fails unless allowUnsafe is set
	const reportUnsafe = (
		problem: string | undefined,
		diagnostics: RenderedDiagnostics
	) => {
		if (!problem) return
		if (opts?.allowUnsafe) diagnostics.warnings.push(problem)
		else diagnostics.errors.push(`${problem} ${allowUnsafeHint}`)
	}
	const reportedPrecompiled = new Set<string>()
	const precompiledProblemOf = (id: string, importer: string) => {
		const name = precompiledDependencyOf(id, importer)
		if (!name || reportedPrecompiled.has(name)) return
		reportedPrecompiled.add(name)
		return writePrecompiledDependencyMessage(name)
	}
	const reportedUntransformed = new Set<string>()
	// e.g. a Svelte component's script, whose Types the build never sees
	const untransformedProblemOf = (id: string, importer: string) => {
		const file = importer.split("?")[0]
		if (
			!resolvesToRuntime(id, opts) ||
			!isAbsolute(file) ||
			dependencyOf(file) ||
			transformedFilter.include.test(importer) ||
			transformedFilter.include.test(file) ||
			reportedUntransformed.has(file)
		)
			return
		reportedUntransformed.add(file)
		return writeUntransformedImportMessage(
			file,
			id,
			realPathOf(opts?.cwd ?? process.cwd())
		)
	}
	// keeps the modules a transformed one writes, for its importers to load
	const transform = async (
		code: string,
		id: string,
		mappings: string | undefined,
		program?: string
	) => {
		const transformed = (await request(
			"transform",
			code,
			fileOf(id),
			mappings,
			program
		)) as TransformedModule | undefined
		if (!transformed) return
		for (const specifier in transformed.modules) {
			const virtualId = virtual + specifier
			if (virtualId in modules) continue
			modules[virtualId] = transformed.modules[specifier]
			importersById[virtualId] = id
			const dir = storeDirOf()
			if (dir) {
				writeFileSync(
					join(dir, storedNameOf(virtualId)),
					JSON.stringify([id, modules[virtualId]])
				)
			}
		}
		return transformed
	}
	// each Rollup, Rolldown or Vite build's scan, by its Vite environment
	const scansByBuild = new WeakMap<object, RollupScan>()
	const rollupBuild = {}
	const buildOf = (context: unknown) =>
		(context as { environment?: object }).environment ?? rollupBuild
	let isServing = false
	// a Vite app's environments share the declarations of the app's build
	const declarationsByApp = new WeakMap<object, Declarations>()
	let app: { environments: Record<string, object> } | undefined
	const declare = (environment: { name: string } | undefined) => {
		const key =
			environment && app?.environments[environment.name] === environment ?
				app
			:	undefined
		const cached = key && declarationsByApp.get(key)
		if (cached) return cached
		const declarations = emitDeclarations({
			cwd: opts?.cwd,
			tsconfig: opts?.tsconfig
		})
		// no build context to warn with, and type errors don't fail a bundle
		if (declarations.diagnostics) console.warn(declarations.diagnostics)
		if (key) declarationsByApp.set(key, declarations)
		return declarations
	}
	// reads the bundle a production build's entries reach, before it loads one
	async function rollupBuildStart(
		this: RollupContext,
		options: { input: string[] | Record<string, string> }
	) {
		reset()
		const build = buildOf(this)
		scansByBuild.delete(build)
		if (isServing || !prunesIn(!!environment?.production)) return
		const scan = await rollupScanOf(
			this,
			`${++scans}`,
			Object.values(options.input),
			id =>
				transformedFilter.include.test(id) &&
				!transformedFilter.exclude.test(id),
			async scanned => (await request("scan", scanned)) as ScannedUsage
		).catch(() => undefined)
		if (scan) scansByBuild.set(build, scan)
	}
	// a module Rollup's watch mode kept was written for an earlier bundle
	const shouldTransformCachedModule = ({ id }: { id: string }) =>
		prunesIn(!!environment?.production) &&
		transformedFilter.include.test(id) &&
		!transformedFilter.exclude.test(id)
	return {
		name: "arktype",
		enforce: "pre",
		resolveId: {
			filter: {
				id: new RegExp(`${resolvedSpecifier.source}|${schemaSpecifier.source}`)
			},
			async handler(id, importer) {
				// the plugin resolves a standalone build's arktype in esbuild's own namespace
				if (meta.framework === "esbuild" && isStandalone && id === "arktype")
					return
				// webpack awaits this unguarded, so it reports an error rather than crash
				const refuse = (message: string): undefined => {
					if (meta.framework !== "webpack") throwBuildError(message)
					this.error(message)
				}
				if (id.startsWith("~arktype/")) return virtual + id
				if (!importer) return
				// a virtual module resolves from the module it was written for
				if (importer.startsWith(`${virtual}~arktype/`))
					return host.resolve(id, importersById[importer])
				if (variant && schemaSpecifier.test(id)) {
					const specifier = variantSpecifierOf(id, variant)
					return specifier ?
							host.resolve(specifier, importer)
						:	refuse(writeVariantImportMessage(fileOf(importer), id, variant))
				}
				const isRuntime = runtimeSpecifiers.includes(id)
				const diagnostics =
					isRuntime ? await readDependency(importer) : noDiagnostics()
				reportUnsafe(precompiledProblemOf(id, importer), diagnostics)
				if (isRuntime)
					reportUnsafe(untransformedProblemOf(id, importer), diagnostics)
				for (const warning of diagnostics.warnings) this.warn(warning)
				if (diagnostics.errors.length)
					return refuse(diagnostics.errors.join("\n"))
				if (isRuntime && resolvesToRuntime(id, opts) && !readsNodes(importer))
					return host.resolve("arktype/runtime", importer)
			}
		},
		load: {
			filter: { id: virtual ? /^\0~arktype\// : /^~arktype\// },
			handler: loadModule
		},
		// esbuild loads each module natively, as unplugin's adapter returns every
		// file a build has watched from each of its hooks
		transform:
			meta.framework === "esbuild" ?
				undefined
			:	{
					filter: { id: transformedFilter },
					async handler(code, id) {
						const file = fileOf(id)
						// a plugin ahead of this one may have transpiled it, as Rollup's
						// TypeScript plugin does, so its lines are read through their map
						const map =
							code === host.readFile(file) ?
								undefined
							:	((
									this as {
										getCombinedSourcemap?: () => { mappings: string }
									}
								).getCombinedSourcemap?.() ??
								(
									this.getNativeBuildContext?.() as
										| { inputSourceMap?: { mappings: string } }
										| undefined
								)?.inputSourceMap)
						const scan = scansByBuild.get(buildOf(this))
						scan?.loaded.set(id, code)
						const transformed = await transform(
							code,
							id,
							map?.mappings,
							scan?.scanned.key
						)
						if (!transformed) return
						for (const dependency of transformed.dependencies)
							if (dependency !== file) this.addWatchFile(dependency)
						reportDiagnostics(
							transformed,
							warning => this.warn(warning),
							throwBuildError
						)
						return (
							transformed.code && {
								code: transformed.code,
								map: transformed.map
							}
						)
					}
				},
		vite: {
			buildStart: rollupBuildStart,
			shouldTransformCachedModule,
			buildApp: async builder => {
				app = builder
			},
			// Vite and Vitest otherwise leave dependencies to Node or prebundling
			config: config => {
				setRoot(resolve(config.root ?? process.cwd()))
				return inlined.length ?
						{
							optimizeDeps: { exclude: packages },
							ssr: { noExternal: inlined },
							test: { server: { deps: { inline: inlined } } }
						}
					:	undefined
			},
			// e.g. Astro's prerender, a server environment other than ssr
			configEnvironment: () =>
				inlined.length ? { resolve: { noExternal: inlined } } : undefined,
			// a module's precompiled code depends on files other than its own,
			// and the modules it imports are written only as it is transformed.
			// An inlined runtime module is cached with @ark/schema/runtime resolved
			// to the variant the options chose, so another variant can't reuse it
			configureVitest: (context: VitestPluginContext) =>
				(
					context.defineCacheKeyGenerator ??
					context.experimental_defineCacheKeyGenerator
				)?.(({ id }) =>
					(
						transformedFilter.include.test(id) &&
						!transformedFilter.exclude.test(id)
					) ?
						false
					:	variant
				),
			options: checkInputExternal,
			// a factory checks its helpers against what Vitest's mocks replace
			configResolved: config => {
				isServing = config.command === "serve"
				resolveIn(!config.isProduction)
				for (const [name, environment] of Object.entries(
					config.environments ?? { ssr: { resolve: config.ssr } }
				)) {
					const external = environment.resolve?.external
					checkExternal(
						specifier =>
							Array.isArray(external) &&
							external.includes(packageNameOf(specifier)),
						name === "ssr" ? "ssr.external" : (
							`environments.${name}.resolve.external`
						),
						message => config.logger.warn(message)
					)
				}
				const testing = !!process.env.VITEST && config.mode === "test"
				setEnvironment({
					production: config.command === "build" && !testing,
					testing
				})
			}
		},
		// loading the precompiler overlaps the bundler's own startup
		buildStart: reset,
		// a build that won't rerun releases its worker
		buildEnd(error?: Error) {
			const scan = scansByBuild.get(buildOf(this))
			if (scan?.verifies && !error) {
				const problem = unseenProblemOf(
					scan.scanned,
					rollupImportsOf(this as never),
					scan.loaded
				)
				// fails before the bundle is written
				if (problem) throwBuildError(problem)
			}
			const native = this.getNativeBuildContext?.()
			const isWatching =
				native && "compiler" in native ?
					native.compiler.watchMode
				:	(this as { meta?: { watchMode?: boolean } }).meta?.watchMode
			if (isWatching === false) restart()
			if (!opts?.declare || isWatching || isServing) return
			const declarations = declare(
				(this as { environment?: { name: string } }).environment
			)
			for (const path in declarations.files) {
				const fileName = relative(declarations.root, path)
				if (fileName.startsWith("../"))
					throwError(writeDeclaredOutsideMessage(path, declarations.root))
				this.emitFile({
					type: "asset",
					fileName,
					source: declarations.files[path]
				})
			}
		},
		watchChange: reset,
		webpack: compiler => {
			setRoot(compiler.context)
			keepCompiler(compiler)
			setEnvironment(environmentOf(compiler))
			// as Rspack does, so a runtime from another version fails the build
			compiler.options.module.rules.push({
				test: /~arktype/,
				parser: { exportsPresence: "error" }
			})
		},
		rspack: compiler => {
			setRoot(compiler.context)
			keepCompiler(compiler)
			setEnvironment(environmentOf(compiler))
		},
		rollup: {
			options: checkInputExternal,
			buildStart: rollupBuildStart,
			shouldTransformCachedModule
		},
		rolldown: { options: checkInputExternal, buildStart: rollupBuildStart },
		esbuild: {
			// read before config, so the handler leaves a standalone build's
			// arktype to resolve natively, outside the plugin's esbuild namespace
			onResolveFilter: /^arktype$|^~arktype\//,
			config: initialOptions =>
				setRoot(initialOptions.absWorkingDir ?? process.cwd()),
			setup: build => {
				if (!build.initialOptions.bundle) throwBuildError(unbundledMessage)
				// esbuild has no mode, but a build may resolve for production
				const production =
					!!build.initialOptions.conditions?.includes("production")
				setEnvironment({ production, testing: false })
				build.onDispose(restart)
				const plugins = build.initialOptions.plugins ?? []
				// a plugin after this one may load a module it leaves, unlike it was read
				const program =
					(
						prunesIn(production) &&
						plugins[plugins.length - 1]?.name === "arktype"
					) ?
						`${++scans}`
					:	undefined
				// the scan's facts hold only while the bundle is what it read
				let scanned: ScannedProgram | undefined
				let verifies = false
				// each module as this plugin loaded it
				const loaded = new Map<string, string>()
				if (program) {
					build.initialOptions.metafile = true
					const cwd = build.initialOptions.absWorkingDir ?? process.cwd()
					build.onStart(async () => {
						scanned = undefined
						verifies = false
						loaded.clear()
						const usage = await esbuildScanOf(
							build,
							program,
							path =>
								transformedFilter.include.test(path) &&
								!transformedFilter.exclude.test(path),
							async scanned => (await request("scan", scanned)) as ScannedUsage
						).catch(() => undefined)
						if (!usage) return
						scanned = usage[0]
						// only what it dropped can fail a read the scan didn't see
						verifies = !!usage[1].dropped.length
					})
					build.onEnd(result => {
						if (
							!scanned ||
							!verifies ||
							!result.metafile ||
							result.errors.length
						)
							return
						const problem = unseenProblemOf(
							scanned,
							esbuildImportsOf(result.metafile, cwd, scanned),
							loaded
						)
						if (!problem) return
						// what it wrote may lack what a module it couldn't see reads
						if (build.initialOptions.write !== false) {
							for (const path in result.metafile.outputs)
								rmSync(resolve(cwd, path), { force: true })
						}
						return { errors: [{ text: problem }] }
					})
				}
				// each module watches what it read, which esbuild takes only from onLoad
				build.onLoad({ filter: esbuildTransformed }, async args => {
					if (args.namespace !== "file") return
					const isTransformed =
						transformedFilter.include.test(args.path) &&
						!transformedFilter.exclude.test(args.path)
					if (!isTransformed && !scanned) return
					const code = readFileSync(args.path, "utf8")
					if (scanned) loaded.set(args.path, code)
					if (!isTransformed) return
					const transformed = await transform(
						code,
						args.path,
						undefined,
						scanned?.key
					)
					if (!transformed?.code && !transformed?.errors.length) return
					return {
						contents: appendSourceMap(
							transformed.code ?? code,
							transformed.map
						),
						loader: esbuildLoaderOf(args.path),
						watchFiles: transformed.dependencies.filter(
							dependency => dependency !== args.path
						),
						// together, as other hosts throw them
						errors:
							transformed.errors.length ?
								[{ text: transformed.errors.join("\n") }]
							:	[],
						warnings: transformed.warnings.map(text => ({ text }))
					}
				})
				const buildVariant = variant
				if (buildVariant) {
					build.onResolve({ filter: schemaSpecifier }, args => {
						if (args.pluginData === esbuildResolution) return
						const specifier = variantSpecifierOf(args.path, buildVariant)
						return specifier ?
								build.resolve(specifier, {
									kind: args.kind,
									importer: args.importer,
									resolveDir: args.resolveDir,
									pluginData: esbuildResolution
								})
							:	{
									errors: [
										{
											text: writeVariantImportMessage(
												fileOf(args.importer),
												args.path,
												buildVariant
											)
										}
									]
								}
					})
				}
				build.onResolve(
					{
						filter:
							isStandalone ?
								specifiersOf(
									...runtimeSpecifiers,
									"arktype/runtime",
									"arktype/internal"
								)
							:	specifiersOf("arktype/runtime", ...internalSpecifiers)
					},
					async args => {
						if (args.pluginData === esbuildResolution) return
						const isRuntime = runtimeSpecifiers.includes(args.path)
						const result = await build.resolve(
							(
								isRuntime &&
									resolvesToRuntime(args.path, opts) &&
									!readsNodes(args.importer)
							) ?
								"arktype/runtime"
							:	args.path,
							{
								kind: args.kind,
								importer: args.importer,
								// a virtual module has no directory of its own
								resolveDir:
									args.importer in importersById ?
										dirname(importersById[args.importer])
									:	args.resolveDir,
								pluginData: esbuildResolution
							}
						)
						const { errors, warnings } =
							isRuntime ? await readDependency(args.importer) : noDiagnostics()
						reportUnsafe(precompiledProblemOf(args.path, args.importer), {
							errors,
							warnings
						})
						if (isRuntime) {
							reportUnsafe(untransformedProblemOf(args.path, args.importer), {
								errors,
								warnings
							})
						}
						return {
							...result,
							errors: [...result.errors, ...errors.map(text => ({ text }))],
							warnings: [
								...result.warnings,
								...warnings.map(text => ({ text }))
							]
						}
					}
				)
			}
		}
	}
})

const esbuildResolution = "arktype"

let scans = 0

interface RollupScan {
	scanned: ScannedProgram
	// whether it left out what a read it didn't see could need
	verifies: boolean
	// each module as this plugin transformed it
	loaded: Map<string, string>
}

// what the plugin reads of a Rollup, Rolldown or Vite build
interface RollupContext {
	resolve: (
		source: string,
		importer?: string,
		options?: { isEntry?: boolean }
	) => Promise<{ id: string; external?: boolean | string } | null>
	getModuleIds: () => IterableIterator<string>
	getModuleInfo: (id: string) => {
		isEntry: boolean
		importedIds: readonly string[]
		dynamicallyImportedIds: readonly string[]
	} | null
}

const rollupScanOf = async (
	context: RollupContext,
	program: string,
	inputs: string[],
	isTransformed: (id: string) => boolean,
	scan: (program: ScannedProgram) => Promise<ScannedUsage>
): Promise<RollupScan | undefined> => {
	const entries: ScanEntry[] = []
	for (const input of inputs) {
		const resolved = await context.resolve(input, undefined, { isEntry: true })
		if (!resolved || resolved.external || !isAbsolute(resolved.id)) return
		if (!htmlId.test(resolved.id)) {
			entries.push({ id: resolved.id })
			continue
		}
		// a page's module scripts, as Vite builds them
		const source = scriptsOf(readFileSync(resolved.id, "utf8"))
		if (source === undefined) return
		entries.push({ id: resolved.id, source })
	}
	const scanned = await scanProgram(program, entries, {
		resolve: async (specifier, importer) => {
			const resolved = await context.resolve(specifier, importer)
			return (
				!resolved ? undefined
				: resolved.external ? null
				: isAbsolute(resolved.id) ? resolved.id
				: undefined
			)
		},
		readFile: id => readFileSync(id, "utf8"),
		isTransformed
	})
	if (!scanned) return
	const usage = await scan(scanned)
	return usage.dropped.length || usage.linked ?
			{ scanned, verifies: !!usage.dropped.length, loaded: new Map() }
		:	undefined
}

const htmlId = /\.html$/

// imports of a page's module scripts, or undefined where one is inline,
// whose module the build writes from the page
const scriptsOf = (html: string): string | undefined => {
	const imports: string[] = []
	for (const [tag] of html.matchAll(/<script\b[^>]*>/gi)) {
		if (!/\btype\s*=\s*["']?module\b/i.test(tag)) continue
		const src = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(tag)
		if (!src) return
		imports.push(`import ${JSON.stringify(src[1] ?? src[2] ?? src[3])}`)
	}
	return imports.join("\n")
}

// the importers a Rollup, Rolldown or Vite build bundled, by module
const rollupImportsOf = (context: RollupContext): Imports => {
	const imports: Imports = { entries: [], modules: [], edges: [] }
	for (const id of context.getModuleIds()) {
		const info = context.getModuleInfo(id)
		if (!info) continue
		imports.modules.push(id)
		if (info.isEntry) imports.entries.push(id)
		for (const target of [...info.importedIds, ...info.dynamicallyImportedIds])
			imports.edges.push([id, target])
	}
	return imports
}

// what the plugin reads of an esbuild build
interface EsbuildBuild {
	initialOptions: {
		entryPoints?: unknown
		stdin?: {
			contents: string | Uint8Array
			resolveDir?: string
			loader?: string
		}
		absWorkingDir?: string
	}
	resolve: (
		path: string,
		options: {
			kind: ImportKind | "entry-point"
			importer?: string
			resolveDir: string
			pluginData: unknown
		}
	) => Promise<{
		path: string
		namespace: string
		external?: boolean
		errors: unknown[]
	}>
}

// the modules esbuild starts from, stdin as a file beside what it imports
const esbuildEntriesOf = async (
	build: EsbuildBuild
): Promise<ScanEntry[] | undefined> => {
	const {
		entryPoints,
		stdin,
		absWorkingDir = process.cwd()
	} = build.initialOptions
	const paths =
		Array.isArray(entryPoints) ?
			entryPoints.map(entry => (typeof entry === "string" ? entry : entry.in))
		: entryPoints && typeof entryPoints === "object" ?
			Object.values(entryPoints as Record<string, string>)
		:	[]
	const entries: ScanEntry[] = []
	for (const path of paths) {
		const result = await build.resolve(path, {
			kind: "entry-point",
			resolveDir: absWorkingDir,
			pluginData: esbuildResolution
		})
		if (result.errors.length || result.namespace !== "file") return
		entries.push({ id: result.path })
	}
	if (stdin) {
		const ext =
			(
				stdin.loader === "ts" ||
				stdin.loader === "tsx" ||
				stdin.loader === "jsx"
			) ?
				stdin.loader
			:	"js"
		entries.push({
			id: join(stdin.resolveDir ?? absWorkingDir, `<stdin>.${ext}`),
			source: String(stdin.contents)
		})
	}
	return entries
}

// what a production bundle's validators are read for, if the scan changes
// what the plugin writes
const esbuildScanOf = async (
	build: EsbuildBuild,
	program: string,
	isTransformed: (path: string) => boolean,
	scan: (program: ScannedProgram) => Promise<ScannedUsage>
): Promise<[ScannedProgram, ScannedUsage] | undefined> => {
	const entries = await esbuildEntriesOf(build)
	const scanned =
		entries &&
		(await scanProgram(program, entries, {
			resolve: async (specifier, importer, kind) => {
				const result = await build.resolve(specifier, {
					kind,
					importer,
					resolveDir: dirname(importer),
					pluginData: esbuildResolution
				})
				return (
					result.errors.length ? undefined
					: result.external ? null
					: result.namespace === "file" ? result.path
					: undefined
				)
			},
			readFile: path => readFileSync(path, "utf8"),
			isTransformed
		}))
	if (!scanned) return
	const usage = await scan(scanned)
	return usage.dropped.length || usage.linked ? [scanned, usage] : undefined
}

// the importers esbuild bundled, by module, from its metafile
const esbuildImportsOf = (
	metafile: Metafile,
	cwd: string,
	scanned: ScannedProgram
): Imports => {
	const stdin = scanned.entries.find(id => basename(id).startsWith("<stdin>."))
	const idOf = (path: string) =>
		path === "<stdin>" ? stdin
		: /^[\w-]+:/.test(path) && !isAbsolute(path) ? undefined
		: resolve(cwd, path)
	const imports: Imports = { entries: [], modules: [], edges: [] }
	for (const input in metafile.inputs) {
		// esbuild reads stdin from its options, as the scan did
		if (input !== "<stdin>") imports.modules.push(idOf(input))
		for (const { path, external } of metafile.inputs[input].imports) {
			const target = !external && idOf(path)
			if (target) imports.edges.push([idOf(input), target])
		}
	}
	for (const output of Object.values(metafile.outputs)) {
		if (output.entryPoint !== undefined)
			imports.entries.push(idOf(output.entryPoint))
	}
	return imports
}

interface Metafile {
	inputs: Record<
		string,
		{ imports: { path: string; external?: boolean | undefined }[] }
	>
	outputs: Record<string, { entryPoint?: string | undefined }>
}

// transformedId, which esbuild's Go regexes can read
const esbuildTransformed = /\.(?:[cm]?[jt]s|[jt]sx)$/

const esbuildLoaderOf = (path: string): "ts" | "tsx" | "js" | "jsx" =>
	path.endsWith("x") ?
		path.endsWith(".tsx") ?
			"tsx"
		:	"jsx"
	: /\.[cm]?ts$/.test(path) ? "ts"
	: "js"

// what the plugin reads of a webpack or Rspack compiler
interface BundlerCompiler {
	context: string
	options: {
		cache?: boolean | { version?: string | undefined } | undefined
		mode?: string | undefined
	}
	hooks: { compilation: Tap<BundlerCompilation> }
	webpack: {
		ExternalModule: abstract new (...args: never[]) => { userRequest: string }
		WebpackError: new (message: string) => Error
	}
}

// webpack and Rspack build for production where no mode is set
const environmentOf = (compiler: BundlerCompiler): Environment => ({
	production: (compiler.options.mode ?? "production") === "production",
	testing: false
})

interface BundlerCompilation {
	hooks: { finishModules: Tap<Iterable<unknown>> }
	errors: Error[]
	warnings: Error[]
}

interface Tap<arg> {
	tap(name: string, fn: (arg: arg) => void): void
}

// what a program or the runtime imports of arktype's packages
const externalizableSpecifiers = [
	...runtimeSpecifiers,
	"arktype/runtime",
	"@ark/schema",
	"@ark/schema/runtime",
	"@ark/util"
]

// whether Rollup's or Rolldown's `external` option matches a specifier
const isExternalIn = (external: unknown, specifier: string): boolean =>
	typeof external === "function" ? !!external(specifier, undefined, false)
	: Array.isArray(external) ?
		external.some(option => isExternalIn(option, specifier))
	: external instanceof RegExp ? external.test(specifier)
	: external === specifier

// what Vitest passes configureVitest, its generator experimental before Vitest 5
interface VitestPluginContext {
	defineCacheKeyGenerator?: CacheKeyGenerator
	experimental_defineCacheKeyGenerator?: CacheKeyGenerator
}

// a generator returning false keeps a module out of Vitest's module cache,
// and a string adds to its key
type CacheKeyGenerator = (
	generate: (context: { id: string }) => string | false | undefined
) => void

const noDiagnostics = (): RenderedDiagnostics => ({ errors: [], warnings: [] })

// in webpack's filesystem cache or Rspack's persistent one, else ""
const storeDirIn = (cache: unknown): string => {
	const options = cache as
		| { type?: string; cacheLocation?: string; storage?: { location?: string } }
		| undefined
	const dir =
		options?.type === "filesystem" ? options.cacheLocation
		: options?.type === "persistent" ? options.storage?.location
		: undefined
	return dir ? join(dir, "arktype") : ""
}

// a module is named for what it holds, so one an earlier build stored holds the same
const storedNameOf = (id: string) =>
	`${encodeURIComponent(id.slice("\0~arktype/".length))}.json`

const internalSpecifiers = [
	"arktype/internal",
	"arktype/internal/precompiled.js"
]

const specifiersOf = (...specifiers: string[]) =>
	new RegExp(
		`^(?:${specifiers.map(s => s.replace(/[$()*+./?[\\\]^{|}]/g, "\\$&")).join("|")})$`
	)

const resolvedSpecifier = new RegExp(
	`${specifiersOf(...runtimeSpecifiers, "arktype/runtime", ...internalSpecifiers).source}|^~arktype\\/`
)

// each says whether a build watches, which esbuild, Bun and Farm don't
const declaringFrameworks = {
	rollup: 1,
	rolldown: 1,
	vite: 1,
	webpack: 1,
	rspack: 1,
	rsbuild: 1
} as const satisfies KeySet
