import { throwError, type KeySet } from "@ark/util"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { basename, dirname, isAbsolute, join, resolve } from "node:path"
import { relative } from "node:path/posix"
import {
	createUnplugin,
	type UnpluginInstance,
	type UnpluginOptions
} from "unplugin"
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
	appendSourceMap,
	createDevelopmentHost,
	createNodeHost,
	dependencyOf,
	fileOf,
	islandDependencySpecifier,
	optedInPackagesOf,
	precompiledDependencyOf,
	packageNameOf,
	printablePathOf,
	realPathOf,
	reportDiagnostics,
	readsNodes,
	resolvesToRuntime,
	runsOnArktype,
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
	writeFilelessImportMessage,
	writeLoadedFirstMessage,
	writeUncachedModuleMessage,
	writeUnwrittenModuleMessage,
	writeVariantImportMessage,
	writeUntransformedImportMessage,
	type PrecompileHost,
	withAllowUnsafe
} from "./host.ts"
import { conflictingPluginPhrase, writeConflictingPlugins } from "./messages.ts"
import type { ScannedProgram, ScannedUsage } from "./precompile.ts"
import { withEnvironment, type Environment } from "./presets.ts"
import {
	addLoaded,
	isAsset,
	scanProgram,
	unfoldedCallProblemOf,
	unseenProblemOf,
	writeUnprunedMessage,
	writeUnscannedFlatMessage,
	type ImportKind,
	type Imports,
	type LoadedSources,
	type ScanEntry
} from "./scan.ts"
import {
	pruneBeforePluginMessage,
	refusePrune,
	resolvePrecompileOptions,
	withSettingsFile
} from "./settings.ts"
import { createAsyncPrecompiler, type BundlerResolve } from "./worker.ts"

export type { PrecompilePluginOptions } from "./driver.ts"

export interface PrecompileUnpluginOptions extends PrecompilePluginOptions {
	// emit declarations with a build that neither watches nor serves
	declare?: boolean | undefined
}

type Options = PrecompileUnpluginOptions | undefined

// Vite, Rollup and Rolldown's plugin is followed by one reading what other
// plugins write
export type PrecompileUnplugin = Omit<
	UnpluginInstance<Options, false>,
	keyof typeof checkingFrameworks
> &
	Pick<UnpluginInstance<Options, true>, keyof typeof checkingFrameworks>

const unplugin = createUnplugin<Options, boolean>((opts, meta) => {
	if (!(meta.framework in declaringFrameworks))
		refuseDeclare(opts, meta.framework)
	// set here or in ark.json, as a host that can't prune would ignore it
	const refusePruneIn = (set: PrecompileUnpluginOptions) => {
		if (!(meta.framework in pruningFrameworks)) refusePrune(set, meta.framework)
	}
	// Rollup's mark of a virtual module, which esbuild prints as a NUL
	const virtual = meta.framework === "esbuild" ? "" : "\0"
	const given = opts
	// the worker applies the preset, after the environment's defaults, which a
	// bundler says once it has read its own configuration
	let set = withSettingsFile(given)
	refusePruneIn(set)
	opts = resolvePrecompileOptions(set)
	let environment: Environment | undefined
	let workerOptions = set
	// a worker of its own lets arktype take the program's configuration
	const create = () =>
		createAsyncPrecompiler({ precompilerOptions: workerOptions })
	let precompiler = Promise.resolve(create())
	// what the precompiler can't resolve while it answers, the bundler may
	const requestResolving = (
		resolve: BundlerResolve | undefined,
		...message: PrecompileRequest
	) =>
		precompiler.then(send => send(message, resolve)).catch(rethrowAsBuildError)
	const request = (...message: PrecompileRequest) =>
		requestResolving(undefined, ...message)
	const replace = (send: ReturnType<typeof create>) => {
		void send(["close"])
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
			(await send(["reset"]).catch(() => false)) ? replace(send) : send
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
	let packages = optedInPackagesOf(
		opts?.cwd ?? process.cwd(),
		opts?.dependencies
	)
	// arktype left to Node loads as itself, not as the runtime validators use,
	// and a package run on arktype must resolve it as the build does
	const inlinedOf = () =>
		isStandalone ?
			[
				...runtimePackages,
				...packages,
				...Object.keys(opts?.dependencies ?? {}).filter(
					name => opts!.dependencies![name] === "arktype"
				)
			]
		:	packages
	let inlined = inlinedOf()
	// the transform hook's filter, read once the bundler's root is set
	const transformedFilter = transformedFilterOf(packages)
	// ark.json and the packages that opt in are found from the bundler's root,
	// e.g. Vite's, unless `cwd` is set
	const setRoot = (root: string) => {
		if (given?.cwd !== undefined || root === (set.cwd ?? process.cwd())) return
		set = withSettingsFile({ ...given, cwd: root })
		refusePruneIn(set)
		opts = resolvePrecompileOptions(set)
		productionHost = createNodeHost(opts)
		developmentHost = undefined
		resolveIn(isDevelopment)
		isStandalone = opts.runtime !== "arktype"
		variant = resolvedVariantOf(opts)
		packages = optedInPackagesOf(root, opts.dependencies)
		inlined = inlinedOf()
		Object.assign(transformedFilter, transformedFilterOf(packages))
		updateWorker()
	}
	const modules: Record<string, string> = {}
	const importersById: Record<string, string> = {}
	// the modules whose precompiled code read each file other than their own
	const dependentsByFile: Record<string, Set<string>> = {}
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
		else throwBuildError(withAllowUnsafe(problem))
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
				const problem =
					foldedHelpersById.size &&
					unfoldedCallProblemOf(
						foldedHelpersById,
						bundlerImportsOf(modules, compilation.moduleGraph),
						isTransformedId,
						realPathOf(opts?.cwd ?? process.cwd())
					)
				if (problem)
					compilation.errors.push(new bundler.webpack.WebpackError(problem))
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
	// Vite's plugins ahead of this one that transform, which a config
	// module given anew names
	let transformersAhead: string[] = []
	const namingTransformers = (
		diagnostics: RenderedDiagnostics
	): RenderedDiagnostics =>
		transformersAhead.length ?
			{
				warnings: diagnostics.warnings,
				errors: diagnostics.errors.map(error =>
					error
						.split(conflictingPluginPhrase)
						.join(writeConflictingPlugins(transformersAhead))
				)
			}
		:	diagnostics
	// what may throw at runtime fails unless allowUnsafe is set, which a
	// message offers only where building anyway may be what's wanted
	const reportUnsafe = (
		problem: string | undefined,
		diagnostics: RenderedDiagnostics,
		offersAllowUnsafe = true
	) => {
		if (!problem) return
		if (opts?.allowUnsafe) return void diagnostics.warnings.push(problem)
		diagnostics.errors.push(
			offersAllowUnsafe ? withAllowUnsafe(problem) : problem
		)
	}
	const reportedPrecompiled = new Set<string>()
	const precompiledProblemOf = (id: string, importer: string) => {
		const name = precompiledDependencyOf(id, importer)
		if (!name || reportedPrecompiled.has(name)) return
		reportedPrecompiled.add(name)
		return writePrecompiledDependencyMessage(name)
	}
	const reportedUntransformed = new Set<string>()
	// files esbuild loaded through this plugin, rather than another ahead of it
	const loadedFiles = new Set<string>()
	// e.g. a Svelte component's script, whose Types the build never sees
	const untransformedProblemOf = (
		id: string,
		importer: string,
		// esbuild's, whose other namespaces hold modules with no file
		namespace = "file"
	) => {
		const file = importer.split("?")[0]
		if (!resolvesToRuntime(id, opts) || reportedUntransformed.has(file)) return
		const cwd = realPathOf(opts?.cwd ?? process.cwd())
		const problem =
			namespace !== "file" || !isAbsolute(file) ?
				writeFilelessImportMessage(importer, id)
			: dependencyOf(file) ? undefined
			: (
				!transformedFilter.include.test(importer) &&
				!transformedFilter.include.test(file)
			) ?
				writeUntransformedImportMessage(file, id, cwd)
			: meta.framework === "esbuild" && !loadedFiles.has(file) ?
				writeLoadedFirstMessage(file, id, cwd)
			:	undefined
		if (problem) reportedUntransformed.add(file)
		return problem
	}
	// the helpers each module exports whose calls the build folds, by file
	const foldedHelpersById = new Map<string, string[]>()
	const isTransformedId = (id: string) =>
		transformedFilter.include.test(id) && !transformedFilter.exclude.test(id)
	// keeps the modules a transformed one writes, for its importers to load
	const transform = async (
		code: string,
		id: string,
		mappings: string | undefined,
		program: string | undefined,
		resolve: BundlerResolve | undefined
	) => {
		const transformed = (await requestResolving(
			resolve,
			"transform",
			code,
			fileOf(id),
			mappings,
			program
		)) as TransformedModule | undefined
		if (!transformed) return
		if (transformed.foldedHelpers.length)
			foldedHelpersById.set(fileOf(id), transformed.foldedHelpers)
		else foldedHelpersById.delete(fileOf(id))
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
	const scansByBuild = new WeakMap<object, BundleScan>()
	// a production build's scan, begun as the plugin transforms a module, as
	// only then can it load what another plugin writes, like a Svelte component
	const pendingScans = new WeakMap<object, PendingScan>()
	const warnedUnpruned = new Set<string>()
	let esbuildScan: BundleScan | undefined
	// a module the scan didn't write reading a unit it declares in one
	// function would read a copy, which another validator could tell apart
	const copiedProblemOf = (
		context: unknown,
		id: string,
		importer: string
	): string | undefined => {
		const scan =
			meta.framework === "esbuild" ?
				esbuildScan
			:	scansByBuild.get(buildOf(context))
		if (!scan?.replaced.has(id) || importer.startsWith(`${virtual}~arktype/`))
			return
		const file = fileOf(importer)
		if (scan.loaded.get(file) === scan.scanned.modules[file]?.source) return
		return writeUnscannedFlatMessage(
			printablePathOf(realPathOf(opts?.cwd ?? process.cwd()), file)
		)
	}
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
	// a production build reads the bundle its entries reach, from the first
	// module it transforms
	function rollupBuildStart(
		this: RollupContext,
		options: { input: string[] | Record<string, string> }
	) {
		reset()
		const build = buildOf(this)
		scansByBuild.delete(build)
		pendingScans.delete(build)
		if (isServing || !prunesIn(!!environment?.production)) return
		pendingScans.set(build, {
			inputs: Object.values(options.input),
			arrivals: new Map(),
			mappings: new Map()
		})
	}
	// the build's scan, once it has read every module its entries reach
	const scanOf = (
		context: RollupContext,
		file: string,
		code: string,
		mappings: string | undefined
	): Promise<BundleScan | undefined> | BundleScan | undefined => {
		const build = buildOf(context)
		const pending = pendingScans.get(build)
		if (!pending) return scansByBuild.get(build)
		arrive(pending, file, code)
		if (mappings) pending.mappings.set(file, mappings)
		pending.scanned ??= rollupScanOf(
			context,
			`${++scans}`,
			pending.inputs,
			id =>
				transformedFilter.include.test(id) &&
				!transformedFilter.exclude.test(id),
			id => arrivalOf(pending, id),
			id => pending.mappings.get(id),
			async scanned =>
				(await requestResolving(
					bundlerResolveOf(context),
					"scan",
					scanned
				)) as ScannedUsage,
			realPathOf(opts?.cwd ?? process.cwd())
		)
			.catch(
				(e: unknown): ProgramScan<BundleScan> => ({
					unpruned: unreadMessageOf(e)
				})
			)
			.then(scan => {
				pending.unpruned = scan.unpruned
				if (scan.read) scansByBuild.set(build, scan.read)
				return scan.read
			})
		return pending.scanned
	}
	// a module Rollup's watch mode kept was written for an earlier bundle
	const shouldTransformCachedModule = ({ id }: { id: string }) =>
		prunesIn(!!environment?.production) &&
		transformedFilter.include.test(id) &&
		!transformedFilter.exclude.test(id)
	// what another plugin writes, like a compiled Svelte component, is read
	// once it's written, as a validator it reads may lack what it reads
	const unwrittenChecker: UnpluginOptions = {
		name: "arktype:unwritten",
		enforce: "post",
		transform: {
			// after each other plugin's, as Rollup and Rolldown run it, but
			// before Vite's dev server writes each import as a URL
			...(meta.framework !== "vite" && { order: "post" }),
			filter: {
				id: { exclude: [/^\0/, /[/\\]node_modules[/\\]/] },
				code: /\bimport\b/
			},
			async handler(code, id) {
				if (
					!isStandalone ||
					opts?.shadow ||
					(transformedFilter.include.test(id) &&
						!transformedFilter.exclude.test(id)) ||
					isAsset(id)
				)
					return
				const map = (
					this as { getCombinedSourcemap?: () => { mappings: string } }
				).getCombinedSourcemap?.()
				reportDiagnostics(
					(await requestResolving(
						bundlerResolveOf(this),
						"checkUnwritten",
						code,
						fileOf(id),
						map?.mappings
					)) as RenderedDiagnostics,
					warning => this.warn(warning),
					throwBuildError
				)
			}
		}
	}
	// Vitest's, which Vite's Plugin type declares only where Vitest is installed
	const vitestHooks = {
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
			)
	}
	const plugin: UnpluginOptions = {
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
				if (id.startsWith("~arktype/")) {
					const problem = importer && copiedProblemOf(this, id, importer)
					return problem ? refuse(problem) : virtual + id
				}
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
				// a Type it defines would throw, so the fix is moving it, not allowUnsafe
				if (isRuntime)
					reportUnsafe(untransformedProblemOf(id, importer), diagnostics, false)
				for (const warning of diagnostics.warnings) this.warn(warning)
				if (diagnostics.errors.length)
					return refuse(diagnostics.errors.join("\n"))
				if (isRuntime && resolvesToRuntime(id, opts) && !readsNodes(importer)) {
					return host.resolve(
						runsOnArktype(importer, opts?.dependencies) ?
							islandDependencySpecifier
						:	"arktype/runtime",
						importer
					)
				}
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
						const scan = await scanOf(this as never, file, code, map?.mappings)
						if (scan) addLoaded(scan.loaded, file, code)
						const transformed = await transform(
							code,
							id,
							map?.mappings,
							scan?.scanned.key,
							bundlerResolveOf(this)
						)
						if (!transformed) return
						for (const dependency of transformed.dependencies) {
							if (dependency === file) continue
							this.addWatchFile(dependency)
							;(dependentsByFile[dependency] ??= new Set()).add(id)
						}
						reportDiagnostics(
							namingTransformers(transformed),
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
			...vitestHooks,
			options: checkInputExternal,
			// Vite transforms a changed module's importers again only where they
			// don't import it, but a module's validators are written from what
			// its imports define
			hotUpdate({ file, modules }) {
				const { moduleGraph } = this.environment
				const dependents = [...(dependentsByFile[fileOf(file)] ?? [])].flatMap(
					id => moduleGraph.getModuleById(id) ?? []
				)
				return dependents.length ?
						[...new Set([...modules, ...dependents])]
					:	undefined
			},
			// a factory checks its helpers against what Vitest's mocks replace
			configResolved: config => {
				const own = config.plugins.findIndex(({ name }) => name === "arktype")
				if (
					config.plugins.findIndex(({ name }) => name === tanstackSplitter) >
					own
				)
					throwError(writeAheadOfSplitterMessage("tanstackRouter()"))
				isServing = config.command === "serve"
				transformersAhead = config.plugins
					.slice(
						0,
						config.plugins.findIndex(plugin => plugin.name === "arktype")
					)
					.filter(
						plugin =>
							plugin.transform && !/^(?:vite|builtin|native):/.test(plugin.name)
					)
					.map(plugin => plugin.name)
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
			if (
				!error &&
				!isServing &&
				foldedHelpersById.size &&
				"getModuleIds" in this
			) {
				const problem = unfoldedCallProblemOf(
					foldedHelpersById,
					rollupImportsOf(this as never, id => id),
					isTransformedId,
					realPathOf(opts?.cwd ?? process.cwd())
				)
				if (problem) throwBuildError(problem)
			}
			const unpruned = pendingScans.get(buildOf(this))?.unpruned
			// once, though each of an app's environments may find it
			if (unpruned && !error && !warnedUnpruned.has(unpruned)) {
				warnedUnpruned.add(unpruned)
				;(this as never as RollupContext).warn(unpruned)
			}
			const scan = scansByBuild.get(buildOf(this))
			if (scan?.verifies && !error) {
				const problem = unseenProblemOf(
					scan.scanned,
					rollupImportsOf(this as never),
					scan.loaded,
					scan.holders,
					realPathOf(opts?.cwd ?? process.cwd())
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
				const esbuildResolve: BundlerResolve = async (specifier, importer) => {
					if (isOwnSpecifier(specifier)) return
					const resolved = await build.resolve(specifier, {
						importer,
						resolveDir: dirname(importer),
						kind: "import-statement"
					})
					return (
							resolved.errors.length ||
								resolved.external ||
								resolved.namespace !== "file"
						) ?
							undefined
						:	resolved.path
				}
				const plugins = build.initialOptions.plugins ?? []
				// a plugin after this one may load a module it leaves, unlike it was read
				const isLast = plugins[plugins.length - 1]?.name === "arktype"
				if (opts?.prune === true && !isLast)
					throwBuildError(pruneBeforePluginMessage)
				const program =
					prunesIn(production) && isLast ? `${++scans}` : undefined
				// a plugin after this one may load a module unlike it was read
				if (prunesIn(production) && !isLast) {
					build.onStart(() => ({
						warnings: [{ text: writeUnprunedMessage(...unprunedBeforePlugin) }]
					}))
				}
				if (isStandalone) {
					const cwd = build.initialOptions.absWorkingDir ?? process.cwd()
					build.initialOptions.metafile = true
					build.onEnd(result => {
						if (!result.metafile || result.errors.length) return
						const problem =
							foldedHelpersById.size &&
							unfoldedCallProblemOf(
								foldedHelpersById,
								esbuildImportsOf(result.metafile, cwd),
								isTransformedId,
								realPathOf(opts?.cwd ?? process.cwd())
							)
						if (!problem) return
						// it wrote calls that throw at runtime
						if (build.initialOptions.write !== false) {
							for (const path in result.metafile.outputs)
								rmSync(resolve(cwd, path), { force: true })
						}
						return { errors: [{ text: problem }] }
					})
				}
				// the scan's facts hold only while the bundle is what it read
				let scanned: ScannedProgram | undefined
				let verifies = false
				let holders: ReadonlySet<string> = new Set()
				const loaded: LoadedSources = new Map()
				esbuildScan = undefined
				if (program) {
					build.initialOptions.metafile = true
					const cwd = build.initialOptions.absWorkingDir ?? process.cwd()
					build.onStart(async () => {
						scanned = undefined
						verifies = false
						esbuildScan = undefined
						loaded.clear()
						const scan = await esbuildScanOf(
							build,
							program,
							path =>
								transformedFilter.include.test(path) &&
								!transformedFilter.exclude.test(path),
							async scanned =>
								(await requestResolving(
									esbuildResolve,
									"scan",
									scanned
								)) as ScannedUsage,
							realPathOf(opts?.cwd ?? process.cwd())
						).catch(
							(e: unknown): ProgramScan<[ScannedProgram, ScannedUsage]> => ({
								unpruned: unreadMessageOf(e)
							})
						)
						const warnings = scan.unpruned ? [{ text: scan.unpruned }] : []
						if (!scan.read) return { warnings }
						const [read, usage] = scan.read
						scanned = read
						// only what it dropped can fail a read the scan didn't see
						verifies = !!usage.dropped.length
						holders = new Set(usage.holders)
						esbuildScan = {
							scanned,
							verifies,
							loaded,
							replaced: new Set(usage.replaced),
							holders
						}
						return { warnings }
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
							loaded,
							holders,
							realPathOf(opts?.cwd ?? process.cwd())
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
				// esbuild loads stdin as written, which the runtime runs only where it
				// defines no Type
				const stdinProblemOf = async (specifier: string) => {
					if (!resolvesToRuntime(specifier, opts)) return
					const stdin = stdinEntryOf(build.initialOptions)!
					const transformed = (await request(
						"transform",
						stdin.source,
						stdin.id
					)) as TransformedModule | undefined
					if (transformed?.code || transformed?.errors.length)
						return untransformedProblemOf(specifier, "<stdin>", "")
				}
				// each module watches what it read, which esbuild takes only from onLoad
				build.onLoad({ filter: esbuildTransformed }, async args => {
					if (args.namespace !== "file") return
					const isTransformed =
						transformedFilter.include.test(args.path) &&
						!transformedFilter.exclude.test(args.path)
					if (!isTransformed && !scanned) return
					if (isTransformed) loadedFiles.add(args.path)
					const code = readFileSync(args.path, "utf8")
					if (scanned) addLoaded(loaded, fileOf(args.path), code)
					if (!isTransformed) return
					const transformed = await transform(
						code,
						args.path,
						undefined,
						scanned?.key,
						esbuildResolve
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
								!isRuntime ||
									!resolvesToRuntime(args.path, opts) ||
									readsNodes(args.importer)
							) ?
								args.path
							: runsOnArktype(args.importer, opts?.dependencies) ?
								islandDependencySpecifier
							:	"arktype/runtime",
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
							reportUnsafe(
								isStdinOf(build.initialOptions, args) ?
									await stdinProblemOf(args.path)
								:	untransformedProblemOf(
										args.path,
										args.importer,
										args.namespace
									),
								{ errors, warnings },
								false
							)
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
	return meta.framework in checkingFrameworks ?
			[plugin, unwrittenChecker]
		:	plugin
})

export const precompile = unplugin as PrecompileUnplugin

const esbuildResolution = "arktype"

let scans = 0

interface BundleScan {
	scanned: ScannedProgram
	// whether it left out what a read it didn't see could need
	verifies: boolean
	// what only modules it wrote may import
	replaced: ReadonlySet<string>
	// each module creating a validator
	holders: ReadonlySet<string>
	// each module as this plugin transformed it
	loaded: LoadedSources
}

// a production build's scan, from its first transformed module on
interface PendingScan {
	inputs: string[]
	scanned?: Promise<BundleScan | undefined>
	// each module as it reached the plugin's transform, which waits for the
	// scan, or as the scan waits for it, by the precompiler's name for it
	arrivals: Map<string, string | Arrival>
	// how each one's lines map to its file's, where a plugin ahead of this
	// one transformed it
	mappings: Map<string, string>
	unpruned?: string | undefined
}

interface Arrival {
	promise: Promise<string>
	resolve: (code: string) => void
}

const arrive = (pending: PendingScan, id: string, code: string) => {
	const arrival = pending.arrivals.get(id)
	if (typeof arrival === "string") return
	arrival?.resolve(code)
	pending.arrivals.set(id, code)
}

const arrivalOf = (
	pending: PendingScan,
	id: string
): string | Promise<string> => {
	const arrival = pending.arrivals.get(id)
	if (typeof arrival === "string") return arrival
	if (arrival) return arrival.promise
	let resolve!: (code: string) => void
	const promise = new Promise<string>(settle => (resolve = settle))
	pending.arrivals.set(id, { promise, resolve })
	return promise
}

// what the plugin reads of a Rollup, Rolldown or Vite build
interface RollupContext {
	resolve: (
		source: string,
		importer?: string,
		options?: { isEntry?: boolean; skipSelf?: boolean }
	) => Promise<RollupResolution | null>
	// a module once it's transformed and parsed, by the resolution it's
	// loaded with
	load: (
		options: Partial<RollupResolution> & { id: string }
	) => Promise<{ code?: string | null } | null>
	getModuleIds: () => IterableIterator<string>
	getModuleInfo: (id: string) => {
		isEntry: boolean
		importedIds: readonly string[]
		dynamicallyImportedIds: readonly string[]
	} | null
	warn: (message: string) => void
}

// what a production bundle's scan read, if it changes what the plugin
// writes, and why it left every member, if it did
interface ProgramScan<read> {
	read?: read | undefined
	unpruned?: string | undefined
}

const unprunedMessageOf = (usage: ScannedUsage): string | undefined =>
	usage.unpruned &&
	writeUnprunedMessage(
		usage.unpruned,
		"Set each member you know no read needs false in ark.json's members, or set prune: false to build them whole without this warning."
	)

const unreadMessageOf = (e: unknown): string =>
	writeUnprunedMessage(`reading the bundle's modules threw ${String(e)}`)

// a plugin after this one may load a module unlike it was read
const unprunedBeforePlugin = [
	"a plugin follows arktype's among esbuild's plugins, which may load a module after it reads the bundle",
	"Move arktype's plugin last, or set prune: false to build them whole without this warning."
] as const

interface RollupResolution {
	id: string
	external?: boolean | string
}

// a specifier this plugin resolves, which would ask the worker that waits on it
const isOwnSpecifier = (specifier: string) =>
	resolvedSpecifier.test(specifier) || schemaSpecifier.test(specifier)

// how a hook's bundler resolves an import, which the precompiler asks for one
// it can't resolve itself, like an alias only the bundler's config names
const bundlerResolveOf = (context: unknown): BundlerResolve | undefined => {
	const rollup = context as Partial<RollupContext>
	if (rollup.resolve) {
		return async (specifier, importer) => {
			if (isOwnSpecifier(specifier)) return
			const resolved = await rollup.resolve!(specifier, importer, {
				skipSelf: true
			})
			return (
					resolved &&
						!resolved.external &&
						isAbsolute(resolved.id) &&
						!resolved.id.includes("?")
				) ?
					resolved.id
				:	undefined
		}
	}
	// webpack and Rspack
	const loaderResolve = (
		context as {
			getNativeBuildContext?: () =>
				| {
						loaderContext?: {
							getResolve?: (options: {
								dependencyType: string
							}) => (context: string, request: string) => Promise<string>
						}
				  }
				| undefined
		}
	)
		.getNativeBuildContext?.()
		?.loaderContext?.getResolve?.({ dependencyType: "esm" })
	if (loaderResolve) {
		return async (specifier, importer) =>
			isOwnSpecifier(specifier) ? undefined : (
				loaderResolve(dirname(importer), specifier).catch(() => undefined)
			)
	}
}

const rollupScanOf = async (
	context: RollupContext,
	program: string,
	inputs: string[],
	isTransformed: (id: string) => boolean,
	// a module the plugin transforms, as it reaches the plugin
	arrivalOf: (id: string) => string | Promise<string>,
	mappingsOf: (id: string) => string | undefined,
	scan: (program: ScannedProgram) => Promise<ScannedUsage>,
	cwd: string
): Promise<ProgramScan<BundleScan>> => {
	// each module's resolution, as a plugin may resolve it with options to
	// load it by
	const resolutions = new Map<string, RollupResolution>()
	const entries: ScanEntry[] = []
	for (const input of inputs) {
		const resolved = await context.resolve(input, undefined, { isEntry: true })
		if (!resolved || resolved.external) {
			return {
				unpruned: writeUnprunedMessage(
					`the entry "${input}" doesn't resolve to a module`
				)
			}
		}
		resolutions.set(resolved.id, resolved)
		if (!htmlId.test(resolved.id)) {
			entries.push({ id: resolved.id })
			continue
		}
		// a page's module scripts, as Vite builds them
		const source = scriptsOf(readFileSync(resolved.id, "utf8"))
		if (source === undefined) {
			return {
				unpruned: writeUnprunedMessage(
					`${printablePathOf(cwd, resolved.id)} holds an inline module script, which it can't read before the build writes it as a module`
				)
			}
		}
		entries.push({ id: resolved.id, source })
	}
	const scanned = await scanProgram(program, entries, {
		resolve: async (specifier, importer) => {
			const resolved = await context.resolve(specifier, importer)
			if (!resolved) return
			if (resolved.external) return null
			resolutions.set(resolved.id, resolved)
			return resolved.id
		},
		load: async id => {
			// the plugin's transform waits for the scan, so a module it
			// transforms is read as it reaches it, after any plugin ahead of it
			const arrival = isTransformed(id) ? arrivalOf(fileOf(id)) : undefined
			if (typeof arrival === "string") return arrival
			const loaded = context.load({ ...resolutions.get(id), id }).then(
				info => info?.code ?? undefined,
				() => undefined
			)
			return arrival ? Promise.race([arrival, loaded]) : loaded
		},
		isTransformed,
		idOf: fileOf,
		cwd
	})
	if (typeof scanned === "string")
		return { unpruned: writeUnprunedMessage(scanned) }
	for (const id in scanned.modules)
		scanned.modules[id].mappings = mappingsOf(id)
	const usage = await scan(scanned)
	return {
		read:
			usage.written ?
				{
					scanned,
					verifies: !!usage.dropped.length,
					replaced: new Set(usage.replaced),
					holders: new Set(usage.holders),
					loaded: new Map()
				}
			:	undefined,
		unpruned: unprunedMessageOf(usage)
	}
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
const rollupImportsOf = (
	context: RollupContext,
	idOf = cachedFileOf()
): Imports => {
	const imports: Imports = { entries: [], modules: [], edges: [] }
	for (const id of context.getModuleIds()) {
		const info = context.getModuleInfo(id)
		if (!info) continue
		imports.modules.push(idOf(id))
		if (info.isEntry) imports.entries.push(idOf(id))
		for (const target of [...info.importedIds, ...info.dynamicallyImportedIds])
			imports.edges.push([idOf(id), idOf(target)])
	}
	return imports
}

// fileOf, once for each id a bundle holds
const cachedFileOf = (): ((id: string) => string) => {
	const files = new Map<string, string>()
	return id => {
		let file = files.get(id)
		if (file === undefined) files.set(id, (file = fileOf(id)))
		return file
	}
}

// what the plugin reads of an esbuild build
interface EsbuildBuild {
	initialOptions: {
		entryPoints?: unknown
		splitting?: boolean
		inject?: string[]
		stdin?: {
			contents: string | Uint8Array
			resolveDir?: string
			sourcefile?: string
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
): Promise<ScanEntry[] | string> => {
	const { entryPoints, absWorkingDir = process.cwd() } = build.initialOptions
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
		if (result.errors.length || result.namespace !== "file")
			return `the entry "${path}" doesn't resolve to a file`
		entries.push({ id: result.path })
	}
	const entry = stdinEntryOf(build.initialOptions)
	if (entry) entries.push(entry)
	return entries
}

// esbuild's stdin, as a file beside what it imports
const stdinEntryOf = ({
	stdin,
	absWorkingDir = process.cwd()
}: EsbuildBuild["initialOptions"]): Required<ScanEntry> | undefined => {
	if (!stdin) return
	const ext =
		stdin.loader === "ts" || stdin.loader === "tsx" || stdin.loader === "jsx" ?
			stdin.loader
		:	"js"
	return {
		id: join(stdin.resolveDir ?? absWorkingDir, `<stdin>.${ext}`),
		source: String(stdin.contents)
	}
}

// whether esbuild names stdin as an import's importer, as a file only where
// both resolveDir and sourcefile are set
const isStdinOf = (
	{ stdin }: EsbuildBuild["initialOptions"],
	args: { importer: string; namespace: string }
): boolean =>
	args.namespace === "" ||
	(stdin?.resolveDir !== undefined &&
		stdin.sourcefile !== undefined &&
		args.importer === resolve(stdin.resolveDir, stdin.sourcefile))

// what a production bundle's validators are read for, if the scan changes
// what the plugin writes
const esbuildScanOf = async (
	build: EsbuildBuild,
	program: string,
	isTransformed: (path: string) => boolean,
	scan: (program: ScannedProgram) => Promise<ScannedUsage>,
	cwd: string
): Promise<ProgramScan<[ScannedProgram, ScannedUsage]>> => {
	const entries = await esbuildEntriesOf(build)
	if (typeof entries === "string")
		return { unpruned: writeUnprunedMessage(entries) }
	const scanned = await scanProgram(program, entries, {
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
		isTransformed,
		idOf: fileOf,
		cwd
	})
	if (typeof scanned === "string")
		return { unpruned: writeUnprunedMessage(scanned) }
	// each entry is its own bundle, unless it splits what they share, and an
	// injected module is one the scan doesn't read
	scanned.isOneChunk =
		scanned.entries.length === 1 &&
		!build.initialOptions.splitting &&
		!build.initialOptions.inject?.length
	const usage = await scan(scanned)
	return {
		read: usage.written ? [scanned, usage] : undefined,
		unpruned: unprunedMessageOf(usage)
	}
}

// the importers esbuild bundled, by module, from its metafile
const esbuildImportsOf = (
	metafile: Metafile,
	cwd: string,
	scanned?: ScannedProgram
): Imports => {
	const stdin = scanned?.entries.find(id => basename(id).startsWith("<stdin>."))
	const fileIdOf = cachedFileOf()
	const idOf = (path: string) =>
		path === "<stdin>" ? stdin
		: /^[\w-]+:/.test(path) && !isAbsolute(path) ? undefined
		: fileIdOf(resolve(cwd, path))
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
		// e.g. webpack's { type: "filesystem" } or Rspack's { type: "persistent" }
		cache?:
			| boolean
			| { type?: string; version?: string | undefined }
			| undefined
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
	moduleGraph: BundlerModuleGraph
	errors: Error[]
	warnings: Error[]
}

interface BundlerModuleGraph {
	getIncomingConnections: (module: never) => Iterable<{ originModule: unknown }>
}

// the importers a webpack or Rspack build bundled, by module
const bundlerImportsOf = (
	modules: Iterable<unknown>,
	graph: BundlerModuleGraph
): Imports => {
	const imports: Imports = { entries: [], modules: [], edges: [] }
	for (const module of modules as { resource?: string }[]) {
		const target = module.resource
		if (target === undefined) continue
		for (const { originModule } of graph.getIncomingConnections(
			module as never
		)) {
			const importer = originModule as { resource?: string } | null
			if (importer) imports.edges.push([importer.resource, target])
			else imports.entries.push(target)
		}
	}
	return imports
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

// each runs a plugin after the others, which reads what they write
const checkingFrameworks = {
	vite: 1,
	rollup: 1,
	rolldown: 1
} as const satisfies KeySet

// the plugin TanStack Router splits a route's code with
const tanstackSplitter = "tanstack-router:code-splitter:compile-reference-file"

const writeAheadOfSplitterMessage = (call: string): string =>
	`arktype's plugin is listed ahead of TanStack Router's, which splits a route's code after arktype's precompiles it, into modules it reads unprecompiled. List precompile.vite() after ${call} in vite.config's plugins.`

// each reads the whole bundle before it transforms a module
const pruningFrameworks = {
	vite: 1,
	rollup: 1,
	rolldown: 1,
	esbuild: 1
} as const satisfies KeySet

// each says whether a build watches, which esbuild, Bun and Farm don't
const declaringFrameworks = {
	rollup: 1,
	rolldown: 1,
	vite: 1,
	webpack: 1,
	rspack: 1,
	rsbuild: 1
} as const satisfies KeySet
