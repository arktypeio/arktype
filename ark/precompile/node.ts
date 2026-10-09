import { throwError } from "@ark/util"
import { registerHooks } from "node:module"
import { fileURLToPath } from "node:url"
import type { InlineModule, PrecompilePluginOptions } from "./driver.ts"
import {
	optedInPackagesOf,
	runtimeSpecifiers,
	transformedFilterOf
} from "./host.ts"
import { createSyncPrecompiler, isPrecompilerWorker } from "./worker.ts"

export const register = (opts?: PrecompilePluginOptions): void => {
	// the worker inherits the flags that registered these hooks
	if (isPrecompilerWorker) return
	const request = createSyncPrecompiler({
		precompilerOptions: {
			...opts,
			inline: true,
			// `node --test` marks each file's process, or runs the files in its own
			checkHelpers:
				opts?.checkHelpers ??
				(process.env.NODE_TEST_CONTEXT !== undefined ||
					process.execArgv.includes("--test"))
		}
	})
	const isStandalone = opts?.runtime !== "arktype"
	const filter = transformedFilterOf(
		optedInPackagesOf(opts?.cwd ?? process.cwd())
	)
	registerHooks({
		resolve: (specifier, context, nextResolve) => {
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
			) as InlineModule | undefined
			for (const warning of transformed?.warnings ?? [])
				process.emitWarning(warning)
			if (transformed?.errors.length) throwError(transformed.errors.join("\n"))
			return transformed?.code ?
					{ ...loaded, source: transformed.code }
				:	loaded
		}
	})
}
