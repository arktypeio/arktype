import { hashOf, throwError } from "@ark/util"
import { dirname } from "node:path"
import { createUnplugin, type UnpluginInstance } from "unplugin"
import {
	createPrecompiler,
	reportDiagnostics,
	type PrecompilePluginOptions
} from "./driver.ts"
import { transformedFilter } from "./host.ts"

export type { PrecompilePluginOptions } from "./driver.ts"

export const precompile: UnpluginInstance<
	PrecompilePluginOptions | undefined,
	false
> = createUnplugin(opts => {
	let precompiler = createPrecompiler(opts)
	const modules: Record<string, string> = {}
	const importersById: Record<string, string> = {}
	return {
		name: "arktype",
		enforce: "pre",
		resolveId: {
			filter: { id: /^arktype(?:\/runtime|\/internal)?$|^~arktype\// },
			handler(id, importer) {
				if (id.startsWith("~arktype/")) return `\0${id}`
				if (!importer) return
				const host = precompiler.graph.host
				// a virtual module has no directory of its own, so arktype resolves from the module it was written for
				if (importer.startsWith("\0~arktype/"))
					return host.resolve(id, importersById[importer])
				if (id !== "arktype") return
				const { errors, warnings } = precompiler.readDependency(importer)
				for (const warning of warnings) this.warn(warning)
				// thrown, since esbuild drops an error reported without a resolution
				if (errors.length) throwError(errors.join("\n"))
				if (precompiler.mode === "standalone")
					return host.resolve("arktype/runtime", importer)
				// arktype's keyword table registers before its keywords are created, if its build includes one
				const keywords = host.resolve(
					"arktype/internal/precompiled.js",
					importer
				)
				const entry = keywords && host.resolve("arktype", importer)
				if (!entry) return
				const entryId = `\0~arktype/entry/${hashOf(entry)}`
				modules[entryId] ??=
					`import ${JSON.stringify(keywords)}\nexport * from ${JSON.stringify(entry)}\n`
				return entryId
			}
		},
		load: {
			filter: { id: /^\0~arktype\// },
			handler: id => modules[id]
		},
		transform: {
			filter: { id: transformedFilter },
			handler(code, id) {
				if (!precompiler.importsArk(code, id)) {
					// a module it imports may come to export a Type
					for (const dependency of precompiler.localImportsOf(code, id))
						this.addWatchFile(dependency)
					return
				}
				const result = precompiler.precompile(code, id)
				for (const dependency of result.dependencies)
					if (dependency !== id) this.addWatchFile(dependency)
				for (const specifier in result.modules) {
					modules[`\0${specifier}`] ??= result.modules[specifier]
					importersById[`\0${specifier}`] ??= id
				}
				reportDiagnostics(result.diagnostics, message => this.warn(message))
				return result.map && { code: result.code, map: result.map }
			}
		},
		// a changed file may be in the forward closure of any module analyzed so far
		watchChange: () => {
			precompiler = createPrecompiler(opts)
		},
		esbuild: {
			// esbuild loads anything a plugin resolves in the plugin's namespace, so arktype's files are resolved natively
			onResolveFilter:
				precompiler.mode === "standalone" ?
					/^~arktype\//
				:	/^arktype$|^~arktype\//,
			setup: build => {
				// the entry arktype resolves to in cache mode imports arktype's files by path
				build.onResolve({ filter: /^(?:\/|[A-Za-z]:[/\\])/ }, args =>
					args.namespace === "file" ? undefined : { path: args.path }
				)
				build.onResolve(
					{
						filter:
							precompiler.mode === "standalone" ?
								/^arktype(?:\/runtime|\/internal)?$/
							:	/^arktype\/(?:runtime|internal)$/
					},
					async args => {
						if (args.pluginData === esbuildResolution) return
						const result = await build.resolve(
							args.path === "arktype" ? "arktype/runtime" : args.path,
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
						if (args.path !== "arktype") return result
						const { errors, warnings } = precompiler.readDependency(
							args.importer
						)
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
