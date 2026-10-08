import { throwError } from "@ark/util"
import { dirname, resolve } from "node:path"
import { createUnplugin, type UnpluginInstance } from "unplugin"
import { createNodeHost, type NodeHostOptions } from "./host.ts"
import type { InterpreterOptions } from "./interpreter.ts"
import { Precompiler, renderDiagnostic } from "./precompile.ts"

export interface PrecompilePluginOptions
	extends NodeHostOptions,
		InterpreterOptions {
	// ship arktype and bind each Type to its precompiled code, rather than shipping standalone validators
	runtime?: "arktype" | undefined
	// the module whose `configure()` call sets the configuration
	config?: string | undefined
}

export const precompile: UnpluginInstance<
	PrecompilePluginOptions | undefined,
	false
> = createUnplugin(opts => {
	const mode = opts?.runtime === "arktype" ? "cache" : "standalone"
	if (mode === "standalone" && opts?.config)
		throwError(standaloneConfigurationMessage)
	const host = createNodeHost(opts)
	const cwd = process.cwd()
	const modules: Record<string, string> = {}
	const importersById: Record<string, string> = {}
	let precompiler: Precompiler | undefined
	return {
		name: "arktype",
		enforce: "pre",
		resolveId: {
			filter: {
				id: mode === "standalone" ? /^arktype$|^~arktype\// : /^~arktype\//
			},
			handler: (id, importer) =>
				id !== "arktype" ? `\0${id}`
				: importer ? host.resolve("arktype/runtime", importer)
				: undefined
		},
		load: {
			filter: { id: /^\0~arktype\// },
			handler: id => modules[id]
		},
		transform: {
			filter: {
				id: { include: /\.(?:[jt]sx?|m[jt]s)$/, exclude: /\/node_modules\// },
				code: /["']arktype(?:\/config)?["']/
			},
			handler(code, id) {
				precompiler ??= new Precompiler(host, {
					mode,
					cwd,
					config: opts?.config && resolve(opts.config),
					define: opts?.define
				})
				const result = precompiler.precompile(code, id)
				for (const dependency of result.dependencies)
					if (dependency !== id) this.addWatchFile(dependency)
				for (const specifier in result.modules) {
					modules[`\0${specifier}`] ??= result.modules[specifier]
					importersById[`\0${specifier}`] ??= id
				}
				const errors: string[] = []
				for (const diagnostic of result.diagnostics) {
					if (diagnostic.severity === "error")
						errors.push(renderDiagnostic(diagnostic))
					else this.warn(renderDiagnostic(diagnostic))
				}
				if (errors.length) this.error(errors.join("\n"))
				return result.map && { code: result.code, map: result.map }
			}
		},
		// a changed file may be in the forward closure of any module analyzed so far
		watchChange: () => {
			precompiler = undefined
		},
		esbuild: {
			// esbuild loads anything a plugin resolves in the plugin's namespace, so arktype's files are resolved natively
			onResolveFilter: /^~arktype\//,
			setup: build =>
				build.onResolve(
					{ filter: /^arktype(?:\/runtime|\/internal)?$/ },
					args =>
						args.pluginData === esbuildResolution ?
							undefined
						:	build.resolve(
								mode === "standalone" && args.path === "arktype" ?
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
				)
		}
	}
})

const esbuildResolution = "arktype"

export const standaloneConfigurationMessage =
	'configure() is not applied to standalone builds yet, so `config` requires runtime: "arktype"'

export type standaloneConfigurationMessage =
	typeof standaloneConfigurationMessage
