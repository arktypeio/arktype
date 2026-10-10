import { throwError } from "@ark/util"
import {
	registerHooks,
	type LoadFnOutput,
	type LoadHookContext
} from "node:module"
import { fileURLToPath, pathToFileURL } from "node:url"
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
	const isTransformed = (id: string) =>
		filter.include.test(id) && !filter.exclude.test(id)
	// hooks registered after these, like tsx's, may give the program other text than a file's, which the configuration is read from
	const giveConfiguration = (
		context: LoadHookContext,
		nextLoad: (url: string, context: LoadHookContext) => LoadFnOutput
	) => {
		const given: string[] = []
		for (;;) {
			const id = (request("unappliedConfigurationModules") as string[]).find(
				id => !given.includes(id) && isTransformed(id)
			)
			if (id === undefined) return
			given.push(id)
			const { source } = nextLoad(pathToFileURL(id).href, {
				...context,
				format: undefined,
				importAttributes: {}
			})
			if (source !== undefined) request("give", textOf(source), id)
		}
	}
	const modules: Record<string, string> = {}
	const importersByUrl: Record<string, string> = {}
	// a loader that compiles a module itself, as tsx does a CommonJS package's, gives these hooks none of its text
	const givenUrls = new Set<string>()
	registerHooks({
		resolve: (specifier, context, nextResolve) => {
			if (specifier.startsWith("~arktype/"))
				return { url: `arktype:${specifier}`, shortCircuit: true }
			// a precompiled module has no directory of its own, so it resolves from the module it was written for
			if (context.parentURL?.startsWith("arktype:"))
				context = { ...context, parentURL: importersByUrl[context.parentURL] }
			if (!runtimeSpecifiers.includes(specifier))
				return nextResolve(specifier, context)
			const importer = context.parentURL
			// a module these hooks never saw wasn't precompiled, so nothing checked what it reads of arktype/runtime, though arktype/config's configure() checks itself
			if (
				isStandalone &&
				specifier === "arktype" &&
				importer?.startsWith("file:") &&
				!givenUrls.has(importer) &&
				isTransformed(fileURLToPath(importer))
			)
				throwError(writeTextlessMessage(fileURLToPath(importer)))
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
					source: modules[url.slice("arktype:".length)],
					shortCircuit: true
				}
			}
			const loaded = nextLoad(url, context)
			if (!url.startsWith("file:")) return loaded
			const id = fileURLToPath(url)
			if (!isTransformed(id) || loaded.source === undefined) return loaded
			givenUrls.add(url)
			giveConfiguration(context, nextLoad)
			const transformed = request("transform", textOf(loaded.source), id) as
				| TransformedModule
				| undefined
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

const textOf = (source: NonNullable<LoadFnOutput["source"]>): string =>
	typeof source === "string" ? source : new TextDecoder().decode(source)

const writeTextlessMessage = (path: string) =>
	`${path} imports arktype, but a loader compiles it without passing its text through @ark/precompile/node's hooks, as tsx does in a CommonJS package, so a standalone build can't precompile it`
