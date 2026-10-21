import { throwError } from "@ark/util"
import module, { type LoadFnOutput } from "node:module"
import { fileURLToPath } from "node:url"
import type {
	PrecompilePluginOptions,
	RenderedDiagnostics,
	TransformedModule
} from "./driver.ts"
import {
	appendSourceMap,
	driverOptionsOf,
	optedInPackagesOf,
	reportDiagnostics,
	resolvesToRuntime,
	resolvedVariantOf,
	runtimeSpecifiers,
	schemaSpecifier,
	transformedFilterOf,
	variantSpecifierOf,
	writeNodeVersionMessage,
	writeTextlessMessage,
	writeVariantImportMessage
} from "./host.ts"
import { refuseDeclare } from "./declare.ts"
import { createSyncPrecompiler, isPrecompilerWorker } from "./worker.ts"

export const register = (opts?: PrecompilePluginOptions): void => {
	// added in Node 22.15
	if (!module.registerHooks)
		throwError(writeNodeVersionMessage("@ark/precompile/node", "22.15"))
	refuseDeclare(opts, "Node")
	// the worker inherits the flags that registered these hooks
	if (isPrecompilerWorker) return
	const isStandalone = opts?.runtime !== "arktype"
	const variant = resolvedVariantOf(opts)
	const request = createSyncPrecompiler({
		precompilerOptions: driverOptionsOf(
			opts,
			// `node --test` marks each file's process, or runs the files in its own
			process.env.NODE_TEST_CONTEXT !== undefined ||
				process.execArgv.includes("--test")
		)
	})
	const filter = transformedFilterOf(
		optedInPackagesOf(opts?.cwd ?? process.cwd())
	)
	const isTransformed = (id: string) =>
		filter.include.test(id) && !filter.exclude.test(id)
	const modules: Record<string, string> = {}
	const importersByUrl: Record<string, string> = {}
	// modules whose text these hooks were given
	const givenUrls = new Set<string>()
	module.registerHooks({
		resolve: (specifier, context, nextResolve) => {
			if (specifier.startsWith("~arktype/"))
				return { url: `arktype:${specifier}`, shortCircuit: true }
			// a precompiled module resolves from the module it was written for
			if (context.parentURL?.startsWith("arktype:"))
				context = { ...context, parentURL: importersByUrl[context.parentURL] }
			if (variant && schemaSpecifier.test(specifier)) {
				return nextResolve(
					variantSpecifierOf(specifier, variant) ??
						throwError(
							writeVariantImportMessage(
								context.parentURL ?? "a module",
								specifier,
								variant
							)
						),
					context
				)
			}
			if (!runtimeSpecifiers.includes(specifier))
				return nextResolve(specifier, context)
			const importer = context.parentURL
			// a module these hooks never saw wasn't precompiled
			if (
				isStandalone &&
				importer?.startsWith("file:") &&
				!givenUrls.has(importer) &&
				isTransformed(fileURLToPath(importer))
			)
				throwError(writeTextlessMessage(fileURLToPath(importer)))
			if (importer?.includes("/node_modules/")) {
				reportDiagnostics(
					request(
						"readDependency",
						fileURLToPath(importer)
					) as RenderedDiagnostics,
					warning => process.emitWarning(warning)
				)
			}
			return nextResolve(
				resolvesToRuntime(specifier, opts) ? "arktype/runtime" : specifier,
				context
			)
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
			const transformed = request("transform", textOf(loaded.source), id) as
				| TransformedModule
				| undefined
			reportDiagnostics(transformed, warning => process.emitWarning(warning))
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
