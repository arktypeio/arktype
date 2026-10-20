import { throwError, type KeySet } from "@ark/util"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
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
	createNodeHost,
	optedInPackagesOf,
	reportDiagnostics,
	resolvesToRuntime,
	resolvesUndetailed,
	runtimeSpecifiers,
	throwBuildError,
	schemaSpecifier,
	transformedFilterOf,
	undetailedSpecifierOf,
	writeUncachedModuleMessage,
	writeUndetailedImportMessage
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
	// a worker of its own lets arktype take the program's configuration
	const create = () =>
		createAsyncPrecompiler({ precompilerOptions: workerOptions ?? {} })
	let precompiler = Promise.resolve(create())
	const request = (...message: PrecompileRequest) =>
		precompiler.then(send => send(...message))
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
			(await send("reset").catch(() => false)) ? replace(send) : send
		)
	}
	const readDependency = (importer: string) =>
		request("readDependency", importer) as Promise<RenderedDiagnostics>
	const host = createNodeHost(opts)
	const isStandalone = opts?.runtime !== "arktype"
	const isUndetailed = resolvesUndetailed(opts)
	const packages = optedInPackagesOf(opts?.cwd ?? process.cwd())
	const modules: Record<string, string> = {}
	const importersById: Record<string, string> = {}
	// a persistent cache keeps a transformed module, but not the modules it wrote
	let compiler: { options: { cache?: unknown } } | undefined
	let storeDir: string | undefined
	// read once the bundler has applied its defaults
	const storeDirOf = () => {
		if (storeDir === undefined && compiler) {
			storeDir = storeDirIn(compiler.options.cache)
			if (storeDir) mkdirSync(storeDir, { recursive: true })
		}
		return storeDir
	}
	const storeIn = (bundler: NonNullable<typeof compiler>) => {
		compiler = bundler
	}
	const loadModule = (id: string) => {
		const dir = storeDirOf()
		if (id in modules || !dir) return modules[id]
		let stored: [importer: string, code: string]
		try {
			stored = JSON.parse(readFileSync(join(dir, storedNameOf(id)), "utf8"))
		} catch {
			return throwBuildError(writeUncachedModuleMessage(id.slice(1), dir))
		}
		importersById[id] = stored[0]
		return (modules[id] = stored[1])
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
					`${resolvedSpecifier.source}${isUndetailed ? `|${schemaSpecifier.source}` : ""}`
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
				if (isUndetailed && schemaSpecifier.test(id)) {
					const undetailed = undetailedSpecifierOf(id)
					return undetailed ?
							host.resolve(undetailed, importer)
						:	refuse(writeUndetailedImportMessage(importer, id))
				}
				if (!runtimeSpecifiers.includes(id)) return
				const { errors, warnings } = await readDependency(importer)
				for (const warning of warnings) this.warn(warning)
				if (errors.length) return refuse(errors.join("\n"))
				if (resolvesToRuntime(id, opts))
					return host.resolve("arktype/runtime", importer)
			}
		},
		load: {
			filter: { id: /^\0~arktype\// },
			handler: loadModule
		},
		transform: {
			filter: { id: transformedFilterOf(packages) },
			async handler(code, id) {
				// a plugin ahead of this one may have transpiled it, as Rollup's
				// TypeScript plugin does, so its lines are read through their map
				const map =
					code === host.readFile(id) ?
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
					id,
					map?.mappings
				)) as TransformedModule | undefined
				if (!transformed) return
				for (const dependency of transformed.dependencies)
					if (dependency !== id) this.addWatchFile(dependency)
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
				packages.length ?
					{
						optimizeDeps: { exclude: packages },
						ssr: { noExternal: packages },
						test: { server: { deps: { inline: packages } } }
					}
				:	undefined,
			// a factory checks its helpers against what Vitest's mocks replace
			configResolved: config => {
				isServing = config.command === "serve"
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
		buildStart: reset,
		// a build that won't rerun releases its worker
		buildEnd() {
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
		webpack: storeIn,
		rspack: storeIn,
		esbuild: {
			// arktype resolves natively, outside the plugin's esbuild namespace
			onResolveFilter: isStandalone ? /^~arktype\// : /^arktype$|^~arktype\//,
			setup: build => {
				build.onDispose(restart)
				if (isUndetailed) {
					build.onResolve({ filter: schemaSpecifier }, args => {
						if (args.pluginData === esbuildResolution) return
						const specifier = undetailedSpecifierOf(args.path)
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
											text: writeUndetailedImportMessage(
												args.importer,
												args.path
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
						if (!isRuntime) return result
						const { errors, warnings } = await readDependency(args.importer)
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
