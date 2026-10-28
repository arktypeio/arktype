import { throwError } from "@ark/util"
import { existsSync } from "node:fs"
import module, { type LoadFnOutput } from "node:module"
import { fileURLToPath } from "node:url"
import type {
	PrecompilePluginOptions,
	RenderedDiagnostics,
	TransformedModule
} from "./driver.ts"
import {
	appendSourceMap,
	dependencyOf,
	driverOptionsOf,
	islandDependencySpecifier,
	optedInPackagesOf,
	precompiledDependencyOf,
	printablePathOf,
	reportDiagnostics,
	readsNodes,
	realPathOf,
	resolvesToRuntime,
	resolvedVariantOf,
	runsOnArktype,
	runtimeSpecifiers,
	schemaSpecifier,
	transformedFilterOf,
	variantSpecifierOf,
	writeFilelessImportMessage,
	writeNodeVersionMessage,
	writePrecompiledDependencyMessage,
	writeTextlessMessage,
	writeUntransformedImportMessage,
	writeVariantImportMessage,
	withAllowUnsafe
} from "./host.ts"
import { refuseDeclare } from "./declare.ts"
import { isProductionEnv } from "./presets.ts"
import {
	refusePrune,
	resolvePrecompileOptions,
	withSettingsFile
} from "./settings.ts"
import { createSyncPrecompiler, isPrecompilerWorker } from "./worker.ts"

export const register = (opts?: PrecompilePluginOptions): void => {
	// added in Node 22.15
	if (!module.registerHooks)
		throwError(writeNodeVersionMessage("@ark/aot/node", "22.15"))
	refuseDeclare(opts, "Node")
	// a worker still runs what NODE_OPTIONS preloads, which may register these hooks
	if (isPrecompilerWorker) return
	const set = withSettingsFile(opts)
	refusePrune(set, "Node")
	opts = resolvePrecompileOptions(set)
	const isStandalone = opts.runtime !== "arktype"
	const variant = resolvedVariantOf(opts)
	const request = createSyncPrecompiler({
		precompilerOptions: driverOptionsOf(
			set,
			// `node --test` marks each file's process, or runs the files in its own
			process.env.NODE_TEST_CONTEXT !== undefined ||
				process.execArgv.includes("--test")
		)
	})
	const filter = transformedFilterOf(
		optedInPackagesOf(opts?.cwd ?? process.cwd(), opts.dependencies)
	)
	const isTransformed = (id: string) =>
		filter.include.test(id) && !filter.exclude.test(id)
	// as a development build resolves it, so Node prints errors as their issues
	const runtimeConditions = isProductionEnv() ? [] : ["development"]
	const resolveRuntime: module.ResolveHookSync = (
		specifier,
		context,
		nextResolve
	) =>
		specifier === "arktype/runtime" ?
			nextResolve(specifier, {
				...context,
				conditions: [...context.conditions, ...runtimeConditions]
			})
		:	nextResolve(specifier, context)
	const modules: Record<string, string> = {}
	const importersByUrl: Record<string, string> = {}
	// modules whose text these hooks were given
	const givenUrls = new Set<string>()
	// allowUnsafe is offered only where building anyway may be what's wanted
	const reportUnsafe = (problem: string, offersAllowUnsafe = true) => {
		if (opts?.allowUnsafe) process.emitWarning(problem)
		else throwError(offersAllowUnsafe ? withAllowUnsafe(problem) : problem)
	}
	const reportedPrecompiled = new Set<string>()
	const checkPrecompiled = (specifier: string, importer: string) => {
		const name = precompiledDependencyOf(specifier, importer)
		if (!name || reportedPrecompiled.has(name)) return
		reportedPrecompiled.add(name)
		reportUnsafe(writePrecompiledDependencyMessage(name))
	}
	// e.g. a module another hook loads, code given to node --eval, or a file without an extension
	const untransformedProblemOf = (specifier: string, importer: string) => {
		if (!importer.startsWith("file:"))
			return writeFilelessImportMessage(importer, specifier)
		const file = fileURLToPath(importer)
		if (isTransformed(file) || dependencyOf(file)) return
		const cwd = realPathOf(opts?.cwd ?? process.cwd())
		return existsSync(file) ?
				writeUntransformedImportMessage(file, specifier, cwd)
			:	writeFilelessImportMessage(printablePathOf(cwd, file), specifier)
	}
	module.registerHooks({
		resolve: (specifier, context, nextResolve) => {
			if (specifier.startsWith("~arktype/"))
				return { url: `arktype:${specifier}`, shortCircuit: true }
			if (
				specifier === "arktype/runtime" &&
				context.parentURL?.startsWith("file:")
			)
				checkPrecompiled(specifier, fileURLToPath(context.parentURL))
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
				return resolveRuntime(specifier, context, nextResolve)
			const importer = context.parentURL
			// a module these hooks never saw wasn't precompiled
			if (
				isStandalone &&
				importer?.startsWith("file:") &&
				!givenUrls.has(importer) &&
				isTransformed(fileURLToPath(importer))
			)
				throwError(writeTextlessMessage(fileURLToPath(importer)))
			const isRedirected =
				resolvesToRuntime(specifier, opts) && !readsNodes(importer)
			if (isRedirected && importer) {
				const problem = untransformedProblemOf(specifier, importer)
				// a Type it defines would throw, so the fix is moving it, not allowUnsafe
				if (problem) reportUnsafe(problem, false)
			}
			if (importer?.includes("/node_modules/")) {
				reportDiagnostics(
					request(
						"readDependency",
						fileURLToPath(importer)
					) as RenderedDiagnostics,
					warning => process.emitWarning(warning)
				)
			}
			return resolveRuntime(
				!isRedirected ? specifier
				: runsOnArktype(importer, opts?.dependencies) ?
					islandDependencySpecifier
				:	"arktype/runtime",
				context,
				nextResolve
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
