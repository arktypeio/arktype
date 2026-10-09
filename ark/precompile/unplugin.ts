import { hashOf, throwError } from "@ark/util"
import { dirname, resolve } from "node:path"
import { createUnplugin, type UnpluginInstance } from "unplugin"
import { createNodeHost, type NodeHostOptions } from "./host.ts"
import {
	copiesHint,
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
	const cwd = opts?.cwd ?? process.cwd()
	let precompiler: Precompiler | undefined
	const precompilerOf = () =>
		(precompiler ??= new Precompiler(host, {
			...opts,
			cwd,
			config: opts?.config && resolve(cwd, opts.config)
		}))
	const warnedDependencies = new Set<string>()
	// a dependency isn't transformed, so its arktype import is checked where it resolves
	const readDependency = (
		importer: string
	): { errors: string[]; warnings: string[] } => {
		const dependency = dependencyOf(importer)
		if (!dependency) return { errors: [], warnings: [] }
		const errors = precompilerOf()
			.readCopies("arktype", importer)
			.map(report =>
				[
					report.message,
					...report.reasons.map(reason => `  ${reason}`),
					`  ${copiesHint}`
				].join("\n")
			)
		const warnings: string[] = []
		if (mode === "standalone" && !warnedDependencies.has(dependency)) {
			warnedDependencies.add(dependency)
			warnings.push(writeStandaloneDependencyMessage(dependency))
		}
		return { errors, warnings }
	}
	return {
		name: "arktype",
		enforce: "pre",
		resolveId: {
			filter: { id: /^arktype(?:\/runtime|\/internal)?$|^~arktype\// },
			handler(id, importer) {
				if (id.startsWith("~arktype/")) return `\0${id}`
				if (!importer) return
				// a virtual module has no directory of its own, so arktype resolves from the module it was written for
				if (importer.startsWith("\0~arktype/"))
					return host.resolve(id, importersById[importer])
				if (id !== "arktype") return
				const { errors, warnings } = readDependency(importer)
				for (const warning of warnings) this.warn(warning)
				// thrown, since esbuild drops an error reported without a resolution
				if (errors.length) throwError(errors.join("\n"))
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
				id: { include: /\.(?:[cm]?[jt]s|[jt]sx)$/, exclude: /\/node_modules\// }
			},
			handler(code, id) {
				const precompiler = precompilerOf()
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
				const errors: string[] = []
				for (const diagnostic of result.diagnostics) {
					if (diagnostic.severity === "error")
						errors.push(renderDiagnostic(diagnostic))
					else this.warn(renderDiagnostic(diagnostic))
				}
				// thrown, since esbuild drops an error reported without a resolution
				if (errors.length) throwError(errors.join("\n"))
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
						const { errors, warnings } = readDependency(args.importer)
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

export const standaloneConfigurationMessage =
	'configure() is not applied to standalone builds yet, so `config` requires runtime: "arktype"'

export type standaloneConfigurationMessage =
	typeof standaloneConfigurationMessage

// the package in node_modules a file belongs to, if any
const dependencyOf = (file: string): string | undefined =>
	/.*\/node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(file)?.[1]

export const writeStandaloneDependencyMessage = <name extends string>(
	name: name
): writeStandaloneDependencyMessage<name> =>
	`${name} imports arktype, which a standalone build resolves to arktype/runtime, where defining a Type throws`

export type writeStandaloneDependencyMessage<name extends string> =
	`${name} imports arktype, which a standalone build resolves to arktype/runtime, where defining a Type throws`
