import { throwError } from "@ark/util"
import { registerHooks } from "node:module"
import { fileURLToPath } from "node:url"
import type { PrecompilePluginOptions, TransformedModule } from "./driver.ts"
import {
	appendSourceMap,
	optedInPackagesOf,
	runtimeSpecifiers,
	transformedFilterOf
} from "./host.ts"
import { createSyncPrecompiler, isPrecompilerWorker } from "./worker.ts"

export const register = (opts?: PrecompilePluginOptions): void => {
	// the worker inherits the flags that registered these hooks
	if (isPrecompilerWorker) return
	const isStandalone = opts?.runtime !== "arktype"
	const request = createSyncPrecompiler({
		precompilerOptions: {
			...opts,
			// a standalone module imports what it shares with others, which the hooks serve
			inline: !isStandalone,
			// `node --test` marks each file's process, or runs the files in its own
			checkHelpers:
				opts?.checkHelpers ??
				(process.env.NODE_TEST_CONTEXT !== undefined ||
					process.execArgv.includes("--test"))
		}
	})
	const filter = transformedFilterOf(
		optedInPackagesOf(opts?.cwd ?? process.cwd())
	)
	const modules: Record<string, string> = {}
	const importersByUrl: Record<string, string> = {}
	registerHooks({
		resolve: (specifier, context, nextResolve) => {
			if (specifier.startsWith("~arktype/"))
				return { url: `arktype:${specifier}`, shortCircuit: true }
			// a precompiled module has no directory of its own, so it resolves from the module it was written for
			if (context.parentURL?.startsWith("arktype:"))
				context = { ...context, parentURL: importersByUrl[context.parentURL] }
			if (!runtimeSpecifiers.includes(specifier))
				return nextResolve(specifier, context)
			if (context.parentURL?.includes("/node_modules/")) {
				const { errors, warnings } = request(
					"readDependency",
					fileURLToPath(context.parentURL)
				) as { errors: string[]; warnings: string[] }
				for (const warning of warnings) process.emitWarning(warning)
				if (errors.length) throwError(errors.join("\n"))
			}
			return nextResolve(isStandalone ? "arktype/runtime" : specifier, context)
		},
		load: (url, context, nextLoad) => {
			if (url.startsWith("arktype:")) {
				return {
					format: "module",
					source: modules[url.slice(8)],
					shortCircuit: true
				}
			}
			const loaded = nextLoad(url, context)
			if (!url.startsWith("file:") || loaded.source === undefined) return loaded
			const id = fileURLToPath(url)
			if (!filter.include.test(id) || filter.exclude.test(id)) return loaded
			const transformed = request(
				"transform",
				typeof loaded.source === "string" ?
					loaded.source
				:	new TextDecoder().decode(loaded.source),
				id
			) as TransformedModule | undefined
			for (const warning of transformed?.warnings ?? [])
				process.emitWarning(warning)
			if (transformed?.errors.length) throwError(transformed.errors.join("\n"))
			if (!transformed?.code) return loaded
			for (const specifier in transformed.modules) {
				modules[specifier] ??= transformed.modules[specifier]
				importersByUrl[`arktype:${specifier}`] ??= url
			}
			return {
				...loaded,
				source: appendSourceMap(transformed.code, transformed.map)
			}
		}
	})
}
