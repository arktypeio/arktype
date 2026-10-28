import { realpathSync } from "node:fs"
import { dirname } from "node:path"
import { parseSync } from "oxc-parser"
import {
	createKeyedPrecompiler,
	type KeyedModule,
	type KeyedPrecompiler,
	type PrecompiledKeyedModule,
	type PrecompilePluginOptions
} from "./driver.ts"
import { refuseDeclare } from "./declare.ts"
import { isProductionEnv, withEnvironment } from "./presets.ts"
import {
	refuseArktypeDependencies,
	refusePrune,
	resolvePrecompileOptions,
	withSettingsFile
} from "./settings.ts"
import {
	createNodeHost,
	createDevelopmentHost,
	dependencyOf,
	printablePathOf,
	reportDiagnostics,
	resolvedVariantOf,
	resolvesToRuntime,
	rethrowAsBuildError,
	runtimeSpecifiers,
	throwBuildError,
	writeAliasMessage,
	writeRuntimeAliasMessage,
	withAllowUnsafe
} from "./host.ts"

export interface TurbopackLoaderContext {
	resourcePath: string
	getOptions(): PrecompilePluginOptions
	// webpack's, where Turbopack's loader context has it
	mode?: string
	addDependency(file: string): void
	emitWarning(warning: Error): void
	// absent where a host can't resolve as Turbopack does
	getResolve?(
		options: Record<string, unknown>
	): (context: string, request: string) => Promise<string>
	async?(): (error: Error | null, result?: string) => void
}

const precompilersByOptions: Record<string, KeyedPrecompiler> = {}

// ark.json is read once for each option set the loader is given
const resolvedByOptions: Record<string, PrecompilePluginOptions> = {}

// with ark.json's, where prune: true would be ignored
const resolvedOptionsOf = (
	given: PrecompilePluginOptions,
	production: boolean
): PrecompilePluginOptions => {
	const set = withSettingsFile(given)
	refusePrune(set, "Turbopack")
	refuseArktypeDependencies(set, "Turbopack")
	return resolvePrecompileOptions(
		withEnvironment(set, { production, testing: false })
	)
}

// a webpack loader, called with its context as `this`
export default function (
	this: TurbopackLoaderContext,
	source: string
): string | undefined {
	const given = this.getOptions()
	refuseDeclare(given, "Turbopack")
	let opts: PrecompilePluginOptions
	try {
		const production = this.mode === "production" || isProductionEnv()
		opts = resolvedByOptions[`${production}${JSON.stringify(given)}`] ??=
			resolvedOptionsOf(given, production)
	} catch (e) {
		return rethrowAsBuildError(e)
	}
	const precompiler = (precompilersByOptions[JSON.stringify(opts)] ??=
		createKeyedPrecompiler(opts))
	let keyed: PrecompiledKeyedModule
	try {
		keyed = precompiler.precompile(source, this.resourcePath)
	} catch (e) {
		return rethrowAsBuildError(e)
	}
	const resolve = this.async && this.getResolve?.({})
	if (!keyed.unresolved.length || !resolve) {
		const loaded = loadedOf(this, precompiler, keyed, source, opts)
		if (typeof loaded !== "object") return loaded
		const done = this.async!()
		loaded.then(code => done(null, code), done)
		return
	}
	const done = this.async!()
	resolvedAgain(precompiler, keyed, resolve, source, this.resourcePath)
		.then(keyed => loadedOf(this, precompiler, keyed, source, opts))
		.then(code => done(null, code), done)
}

// once Turbopack resolves imports the precompiler couldn't, like one only resolveAlias names
const resolvedAgain = async (
	precompiler: KeyedPrecompiler,
	keyed: PrecompiledKeyedModule,
	resolve: (context: string, request: string) => Promise<string>,
	source: string,
	id: string
): Promise<PrecompiledKeyedModule> => {
	while (keyed.unresolved.length) {
		const resolved = await Promise.all(
			keyed.unresolved.map(
				async ([specifier, importer]) =>
					[
						specifier,
						importer,
						await resolve(dirname(importer), specifier).catch(() => undefined)
					] as [string, string, string | undefined]
			)
		)
		if (!precompiler.learn(resolved)) break
		try {
			keyed = precompiler.precompile(source, id)
		} catch (e) {
			return rethrowAsBuildError(e)
		}
	}
	return keyed
}

// the module's code, once what it reads is checked
const loadedOf = (
	context: TurbopackLoaderContext,
	precompiler: KeyedPrecompiler,
	keyed: KeyedModule,
	source: string,
	opts: PrecompilePluginOptions
): string | Promise<string> => {
	const warn = (warning: string) => context.emitWarning(new Error(warning))
	// before any error, so a fix to one of them reruns the loader
	for (const file of keyed.files)
		if (file !== context.resourcePath) context.addDependency(file)
	reportDiagnostics(keyed, warn, throwBuildError)
	const code = keyed.code ?? source
	const specifiers =
		source.includes("arktype") ?
			runtimeImportsOf(source, context.resourcePath)
		:	[]
	// resolveAlias gives a dependency the runtime too, so one defining a Type fails here
	if (specifiers.length && dependencyOf(context.resourcePath)) {
		reportDiagnostics(
			precompiler.readDependency(context.resourcePath),
			warn,
			throwBuildError
		)
	}
	if (!specifiers.length || !context.getResolve || !context.async) return code
	return checkAliases(
		context.getResolve({}),
		context.resourcePath,
		specifiers,
		opts,
		warn
	).then(() => code)
}

// Turbopack resolves arktype as `resolveAlias` says, which the loader can't change
const checkAliases = async (
	resolve: (context: string, request: string) => Promise<string>,
	importer: string,
	specifiers: string[],
	opts: PrecompilePluginOptions,
	warn: (warning: string) => void
) => {
	const host = createNodeHost(opts)
	const runtime = host.resolve("arktype/runtime", importer)
	if (!runtime) return
	const development = createDevelopmentHost(opts).resolve(
		"arktype/runtime",
		importer
	)
	for (const specifier of specifiers) {
		// Turbopack reports what it can't resolve itself
		const resolved = await resolve(dirname(importer), specifier).catch(
			() => undefined
		)
		if (resolved === undefined) continue
		// next dev resolves the runtime that has Node print errors as issues
		const isRuntime = [runtime, development].some(
			path => path && realpathSync(resolved) === realpathSync(path)
		)
		if (isRuntime !== resolvesToRuntime(specifier, opts)) {
			throwBuildError(
				writeAliasMessage(
					specifier,
					isRuntime ? undefined : (
						printablePathOf(opts.cwd ?? process.cwd(), resolved)
					),
					opts
				)
			)
		}
	}
	if (opts.runtime === "arktype" || opts.shadow) return
	// the runtime loads @ark/schema's, which the build may replace with a copy
	const variant = resolvedVariantOf(opts)
	const expected = host.resolve(
		variant ? `@ark/schema/runtime/${variant}` : "@ark/schema/runtime",
		runtime
	)
	const resolved = await resolve(dirname(runtime), "@ark/schema/runtime").catch(
		() => undefined
	)
	if (
		expected === undefined ||
		resolved === undefined ||
		realpathSync(resolved) === realpathSync(expected)
	)
		return
	const problem = writeRuntimeAliasMessage(
		printablePathOf(opts.cwd ?? process.cwd(), resolved),
		variant
	)
	if (opts.allowUnsafe) warn(problem)
	else throwBuildError(withAllowUnsafe(problem))
}

// the runtime specifiers a module imports or exports from, not those it mentions
const runtimeImportsOf = (source: string, id: string): string[] => {
	const { module } = parseSync(id, source)
	const imported = new Set([
		...module.staticImports.map(entry => entry.moduleRequest.value),
		...module.staticExports.flatMap(entry =>
			entry.entries.flatMap(e => e.moduleRequest?.value ?? [])
		)
	])
	return runtimeSpecifiers.filter(specifier => imported.has(specifier))
}
