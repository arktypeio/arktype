import { throwError, type KeySet } from "@ark/util"
import { dirname } from "node:path"
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
	TransformedModule
} from "./driver.ts"
import {
	createNodeHost,
	optedInPackagesOf,
	resolvesToRuntime,
	runtimeSpecifiers,
	transformedFilterOf
} from "./host.ts"
import { createAsyncPrecompiler } from "./worker.ts"

export type { PrecompilePluginOptions } from "./driver.ts"

export interface PrecompileUnpluginOptions extends PrecompilePluginOptions {
	// emit the tsconfig's declarations with the bundle of a build that neither watches nor serves
	declare?: boolean | undefined
}

export const precompile: UnpluginInstance<
	PrecompileUnpluginOptions | undefined,
	false
> = createUnplugin((opts, meta) => {
	if (!(meta.framework in declaringFrameworks))
		refuseDeclare(opts, meta.framework)
	let options = opts
	// arktype in a worker of its own takes the program's configuration, and shares no state with the bundler's
	const create = () =>
		createAsyncPrecompiler({ precompilerOptions: options ?? {} })
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
	// a changed file may be in the forward closure of any module analyzed so far, and a changed configuration needs a thread of its own
	const reset = () => {
		precompiler = precompiler.then(async send =>
			// a config module the worker can't read is reported where a module is transformed
			(await send("reset").catch(() => false)) ? replace(send) : send
		)
	}
	const readDependency = (importer: string) =>
		request("readDependency", importer) as Promise<{
			errors: string[]
			warnings: string[]
		}>
	const host = createNodeHost(opts)
	const isStandalone = opts?.runtime !== "arktype"
	const packages = optedInPackagesOf(opts?.cwd ?? process.cwd())
	const modules: Record<string, string> = {}
	const importersById: Record<string, string> = {}
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
		// a build context can't warn here, and a bundler doesn't fail on TypeScript's errors
		if (declarations.diagnostics) console.warn(declarations.diagnostics)
		if (key) declarationsByApp.set(key, declarations)
		return declarations
	}
	return {
		name: "arktype",
		enforce: "pre",
		resolveId: {
			filter: {
				id: /^arktype(?:\/runtime|\/internal(?:\/precompiled\.js)?|\/config)?$|^~arktype\//
			},
			async handler(id, importer) {
				if (id.startsWith("~arktype/")) return `\0${id}`
				if (!importer) return
				// a virtual module has no directory of its own, so arktype resolves from the module it was written for
				if (importer.startsWith("\0~arktype/"))
					return host.resolve(id, importersById[importer])
				if (!runtimeSpecifiers.includes(id)) return
				const { errors, warnings } = await readDependency(importer)
				for (const warning of warnings) this.warn(warning)
				// thrown, since esbuild drops an error reported without a resolution
				if (errors.length) throwError(errors.join("\n"))
				if (resolvesToRuntime(id, opts))
					return host.resolve("arktype/runtime", importer)
			}
		},
		load: {
			filter: { id: /^\0~arktype\// },
			handler: id => modules[id]
		},
		transform: {
			filter: { id: transformedFilterOf(packages) },
			async handler(code, id) {
				const transformed = (await request("transform", code, id)) as
					| TransformedModule
					| undefined
				if (!transformed) return
				for (const dependency of transformed.dependencies)
					if (dependency !== id) this.addWatchFile(dependency)
				for (const specifier in transformed.modules) {
					modules[`\0${specifier}`] ??= transformed.modules[specifier]
					importersById[`\0${specifier}`] ??= id
				}
				for (const warning of transformed.warnings) this.warn(warning)
				// thrown, since esbuild drops an error reported without a resolution
				if (transformed.errors.length) throwError(transformed.errors.join("\n"))
				return (
					transformed.code && { code: transformed.code, map: transformed.map }
				)
			}
		},
		vite: {
			buildApp: async builder => {
				app = builder
			},
			// Vite and Vitest leave dependencies to Node or to their prebundling unless told otherwise
			config: () =>
				packages.length ?
					{
						optimizeDeps: { exclude: packages },
						ssr: { noExternal: packages },
						test: { server: { deps: { inline: packages } } }
					}
				:	undefined,
			// Vitest's module mocks replace what a module exports, which a factory checks its static helpers against
			configResolved: config => {
				isServing = config.command === "serve"
				if (
					opts?.checkHelpers !== undefined ||
					!process.env.VITEST ||
					config.mode !== "test"
				)
					return
				options = { ...opts, checkHelpers: true }
				restart()
			}
		},
		// loading the precompiler overlaps the bundler's own startup
		buildStart: reset,
		// a build that won't run again releases its worker, which Rollup, Vite, webpack and Rspack tell here and esbuild at onDispose
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
		esbuild: {
			// esbuild loads anything a plugin resolves in the plugin's namespace, so arktype's files are resolved natively
			onResolveFilter: isStandalone ? /^~arktype\// : /^arktype$|^~arktype\//,
			setup: build => {
				build.onDispose(restart)
				build.onResolve(
					{
						filter:
							isStandalone ?
								/^arktype(?:\/runtime|\/internal|\/config)?$/
							:	/^arktype\/(?:runtime|internal(?:\/precompiled\.js)?)$/
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

// each says whether a build watches, which esbuild, Bun and Farm don't
const declaringFrameworks = {
	rollup: 1,
	rolldown: 1,
	vite: 1,
	webpack: 1,
	rspack: 1,
	rsbuild: 1
} as const satisfies KeySet
