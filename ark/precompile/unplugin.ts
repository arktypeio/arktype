import { hashOf, throwError } from "@ark/util"
import { dirname, resolve } from "node:path"
import { createUnplugin, type UnpluginInstance } from "unplugin"
import { createNodeHost, type NodeHostOptions } from "./host.ts"
import {
	Precompiler,
	renderDiagnostic,
	type PrecompileOptions
} from "./precompile.ts"

export interface PrecompilePluginOptions
	extends PrecompileOptions,
		NodeHostOptions {}

export const precompile: UnpluginInstance<
	PrecompilePluginOptions | undefined,
	false
> = createUnplugin(opts => {
	const mode = opts?.runtime === "arktype" ? "cache" : "standalone"
	if (mode === "standalone" && opts?.config)
		throwError(standaloneConfigurationMessage)
	const host = createNodeHost(opts)
	const modules: Record<string, string> = {}
	const importersById: Record<string, string> = {}
	let precompiler: Precompiler | undefined
	return {
		name: "arktype",
		enforce: "pre",
		resolveId: {
			filter: { id: /^arktype$|^~arktype\// },
			handler: (id, importer) => {
				if (id !== "arktype") return `\0${id}`
				if (!importer) return
				if (mode === "standalone")
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
			filter: {
				id: { include: /\.(?:[jt]sx?|m[jt]s)$/, exclude: /\/node_modules\// },
				code: /["']arktype(?:\/config)?["']/
			},
			handler(code, id) {
				const cwd = opts?.cwd ?? process.cwd()
				precompiler ??= new Precompiler(host, {
					...opts,
					cwd,
					config: opts?.config && resolve(cwd, opts.config)
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
			onResolveFilter:
				mode === "standalone" ? /^~arktype\// : /^arktype$|^~arktype\//,
			setup: build => {
				// the entry arktype resolves to in cache mode imports arktype's files by path
				build.onResolve({ filter: /^(?:\/|[A-Za-z]:[/\\])/ }, args =>
					args.namespace === "file" ? undefined : { path: args.path }
				)
				build.onResolve(
					{
						filter:
							mode === "standalone" ?
								/^arktype(?:\/runtime|\/internal)?$/
							:	/^arktype\/(?:runtime|internal)$/
					},
					args =>
						args.pluginData === esbuildResolution ?
							undefined
						:	build.resolve(
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
				)
			}
		}
	}
})

const esbuildResolution = "arktype"

export const standaloneConfigurationMessage =
	'configure() is not applied to standalone builds yet, so `config` requires runtime: "arktype"'

export type standaloneConfigurationMessage =
	typeof standaloneConfigurationMessage
