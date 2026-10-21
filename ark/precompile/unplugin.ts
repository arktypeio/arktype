import { throwError, type KeySet } from "@ark/util"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, isAbsolute, join } from "node:path"
import { relative } from "node:path/posix"
import { createUnplugin, type UnpluginInstance } from "unplugin"
import type { UnitReaders } from "arktype/internal/standalone.ts"
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
	createDevelopmentHost,
	createNodeHost,
	dependencyOf,
	fileOf,
	optedInPackagesOf,
	precompiledDependencyOf,
	packageNameOf,
	reportDiagnostics,
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
	let workerOptions = opts
	let unitReaders: UnitReaders | undefined
	// a worker of its own lets arktype take the program's configuration
	const create = () =>
		createAsyncPrecompiler({
			precompilerOptions: workerOptions ?? {},
			unitReaders
		})
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
	// a changed file or configuration may need a new worker
	const reset = () => {
		precompiler = precompiler.then(async send =>
			// a config the worker can't read is reported at the next transform
			(await send("reset", unitReaders).catch(() => false)) ?
				replace(send)
			:	send
		)
	}
	const readDependency = (importer: string) =>
		request("readDependency", importer) as Promise<RenderedDiagnostics>
	const productionHost = createNodeHost(opts)
	let developmentHost: PrecompileHost | undefined
	// resolves as the bundler's mode would, e.g. arktype/runtime in development
	let host = productionHost
	const resolveIn = (isDevelopment: boolean) => {
		host =
			isDevelopment ?
				(developmentHost ??= createDevelopmentHost(opts))
			:	productionHost
	}
	const isStandalone = opts?.runtime !== "arktype"
	const variant = resolvedVariantOf(opts)
	const packages = optedInPackagesOf(opts?.cwd ?? process.cwd())
	// arktype left to Node loads as itself, not as the runtime validators use
	const inlined = isStandalone ? [...runtimePackages, ...packages] : packages
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
	// Vite's, for what plugins keep between builds
	let cacheDir: string | undefined
	// so a later build can write a unit read by one other into its reader
	let unitReadersById: Record<string, UnitReaders> | undefined
	const readersFileOf = () => {
		const dir = storeDirOf() || (cacheDir && join(cacheDir, "arktype"))
		return dir && join(dir, "readers.json")
	}
	const loadUnitReaders = () => {
		const file = readersFileOf()
		if (!file) return
		if (!unitReadersById) {
			try {
				unitReadersById = JSON.parse(readFileSync(file, "utf8"))
			} catch {
				unitReadersById = {}
			}
		}
		const readers: Record<string, string[]> = {}
		for (const id in unitReadersById) {
			for (const specifier in unitReadersById[id]) {
				const into = (readers[specifier] ??= [])
				for (const reader of unitReadersById[id][specifier])
					if (!into.includes(reader)) into.push(reader)
			}
		}
		unitReaders = readers
	}
	const saveUnitReaders = () => {
		const file = readersFileOf()
		if (!file || !unitReadersById) return
		mkdirSync(dirname(file), { recursive: true })
		writeFileSync(file, JSON.stringify(unitReadersById))
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
	const transformedFilter = transformedFilterOf(packages)
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
		return writeUntransformedImportMessage(file, id, opts?.cwd ?? process.cwd())
	}
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
	return {
		name: "arktype",
		enforce: "pre",
		resolveId: {
			filter: {
				id: new RegExp(
					`${resolvedSpecifier.source}${variant ? `|${schemaSpecifier.source}` : ""}`
				)
			},
			async handler(id, importer) {
				// webpack awaits this unguarded, so it reports an error rather than crash
				const refuse = (message: string): undefined => {
					if (meta.framework !== "webpack") throwBuildError(message)
					this.error(message)
				}
				if (id.startsWith("~arktype/")) return `\0${id}`
				if (!importer) return
				// a virtual module resolves from the module it was written for
				if (importer.startsWith("\0~arktype/"))
					return host.resolve(id, importersById[importer])
				if (variant && schemaSpecifier.test(id)) {
					const specifier = variantSpecifierOf(id, variant)
					return specifier ?
							host.resolve(specifier, importer)
						:	refuse(writeVariantImportMessage(fileOf(importer), id, variant))
				}
				const isRuntime = runtimeSpecifiers.includes(id)
				const diagnostics =
					isRuntime ? await readDependency(fileOf(importer)) : noDiagnostics()
				reportUnsafe(precompiledProblemOf(id, importer), diagnostics)
				if (isRuntime)
					reportUnsafe(untransformedProblemOf(id, importer), diagnostics)
				for (const warning of diagnostics.warnings) this.warn(warning)
				if (diagnostics.errors.length)
					return refuse(diagnostics.errors.join("\n"))
				if (isRuntime && resolvesToRuntime(id, opts))
					return host.resolve("arktype/runtime", importer)
			}
		},
		load: {
			filter: { id: /^\0~arktype\// },
			handler: loadModule
		},
		transform: {
			filter: { id: transformedFilter },
			async handler(code, id) {
				const file = fileOf(id)
				// a plugin ahead of this one may have transpiled it, as Rollup's
				// TypeScript plugin does, so its lines are read through their map
				const map =
					code === host.readFile(file) ?
						undefined
					:	((
							this as { getCombinedSourcemap?: () => { mappings: string } }
						).getCombinedSourcemap?.() ??
						(
							this.getNativeBuildContext?.() as
								| { inputSourceMap?: { mappings: string } }
								| undefined
						)?.inputSourceMap)
				const transformed = (await request(
					"transform",
					code,
					file,
					map?.mappings
				)) as TransformedModule | undefined
				if (!transformed) return
				if (unitReadersById) unitReadersById[id] = transformed.unitReaders
				for (const dependency of transformed.dependencies)
					if (dependency !== file) this.addWatchFile(dependency)
				for (const specifier in transformed.modules) {
					const virtualId = `\0${specifier}`
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
				// esbuild drops a reported error
				reportDiagnostics(
					transformed,
					warning => this.warn(warning),
					throwBuildError
				)
				return (
					transformed.code && { code: transformed.code, map: transformed.map }
				)
			}
		},
		vite: {
			buildApp: async builder => {
				app = builder
			},
			// Vite and Vitest otherwise leave dependencies to Node or prebundling
			config: () =>
				inlined.length ?
					{
						optimizeDeps: { exclude: packages },
						ssr: { noExternal: inlined },
						test: { server: { deps: { inline: inlined } } }
					}
				:	undefined,
			// e.g. Astro's prerender, a server environment other than ssr
			configEnvironment: () =>
				inlined.length ? { resolve: { noExternal: inlined } } : undefined,
			// a module's precompiled code depends on files other than its own,
			// and the modules it imports are written only as it is transformed
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
					:	undefined
				),
			options: checkInputExternal,
			// a factory checks its helpers against what Vitest's mocks replace
			configResolved: config => {
				isServing = config.command === "serve"
				resolveIn(!config.isProduction)
				cacheDir = config.cacheDir
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
				if (
					opts?.checks !== undefined ||
					opts?.runtime === "arktype" ||
					!process.env.VITEST ||
					config.mode !== "test"
				)
					return
				workerOptions = { ...opts, checks: "helpers" }
				restart()
			}
		},
		// loading the precompiler overlaps the bundler's own startup
		buildStart: () => {
			loadUnitReaders()
			reset()
		},
		// a build that won't rerun releases its worker
		buildEnd() {
			saveUnitReaders()
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
			keepCompiler(compiler)
			// as Rspack does, so a runtime from another version fails the build
			compiler.options.module.rules.push({
				test: /~arktype/,
				parser: { exportsPresence: "error" }
			})
		},
		rspack: keepCompiler,
		rollup: { options: checkInputExternal },
		rolldown: { options: checkInputExternal },
		esbuild: {
			// arktype resolves natively, outside the plugin's esbuild namespace
			onResolveFilter: isStandalone ? /^~arktype\// : /^arktype$|^~arktype\//,
			setup: build => {
				if (!build.initialOptions.bundle) throwBuildError(unbundledMessage)
				build.onDispose(restart)
				if (variant) {
					build.onResolve({ filter: schemaSpecifier }, args => {
						if (args.pluginData === esbuildResolution) return
						const specifier = variantSpecifierOf(args.path, variant)
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
												args.importer,
												args.path,
												variant
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
							isRuntime && resolvesToRuntime(args.path, opts) ?
								"arktype/runtime"
							:	args.path,
							{
								kind: args.kind,
								importer: args.importer,
								// a virtual module has no directory of its own
								resolveDir:
									args.namespace === "file" ?
										args.resolveDir
									:	dirname(importersById[args.importer]),
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

// what the plugin reads of a webpack or Rspack compiler
interface BundlerCompiler {
	options: { cache?: unknown; mode?: string }
	hooks: { compilation: Tap<BundlerCompilation> }
	webpack: {
		ExternalModule: abstract new (...args: never[]) => { userRequest: string }
		WebpackError: new (message: string) => Error
	}
}

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

// a generator returning false keeps a module out of Vitest's module cache
type CacheKeyGenerator = (
	generate: (context: { id: string }) => false | undefined
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
