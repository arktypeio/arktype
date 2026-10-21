import { realpathSync } from "node:fs"
import { dirname, relative } from "node:path"
import { parseSync } from "oxc-parser"
import {
	createKeyedPrecompiler,
	type KeyedModule,
	type PrecompilePluginOptions
} from "./driver.ts"
import { refuseDeclare } from "./declare.ts"
import {
	allowUnsafeHint,
	createNodeHost,
	createDevelopmentHost,
	reportDiagnostics,
	resolvedVariantOf,
	resolvesToRuntime,
	rethrowAsBuildError,
	runtimeSpecifiers,
	throwBuildError,
	writeAliasMessage,
	writeRuntimeAliasMessage
} from "./host.ts"

export interface TurbopackLoaderContext {
	resourcePath: string
	getOptions(): PrecompilePluginOptions
	addDependency(file: string): void
	emitWarning(warning: Error): void
	// absent where a host can't resolve as Turbopack does
	getResolve?(): (context: string, request: string) => Promise<string>
	async?(): (error: Error | null, result?: string) => void
}

const precompilersByOptions: Record<
	string,
	(source: string, id: string) => KeyedModule
> = {}

// a webpack loader, called with its context as `this`
export default function (
	this: TurbopackLoaderContext,
	source: string
): string | undefined {
	const opts = this.getOptions()
	refuseDeclare(opts, "Turbopack")
	const precompile = (precompilersByOptions[JSON.stringify(opts)] ??=
		createKeyedPrecompiler(opts))
	let keyed: KeyedModule
	try {
		keyed = precompile(source, this.resourcePath)
	} catch (e) {
		return rethrowAsBuildError(e)
	}
	// before any error, so a fix to one of them reruns the loader
	for (const file of keyed.files)
		if (file !== this.resourcePath) this.addDependency(file)
	reportDiagnostics(
		keyed,
		warning => this.emitWarning(new Error(warning)),
		throwBuildError
	)
	const code = keyed.code ?? source
	const specifiers =
		source.includes("arktype") ?
			runtimeImportsOf(source, this.resourcePath)
		:	[]
	if (!specifiers.length || !this.getResolve || !this.async) return code
	const done = this.async()
	checkAliases(
		this.getResolve(),
		this.resourcePath,
		specifiers,
		opts,
		warning => this.emitWarning(new Error(warning))
	).then(() => done(null, code), done)
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
					isRuntime ? undefined : relative(opts.cwd ?? process.cwd(), resolved),
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
		relative(opts.cwd ?? process.cwd(), resolved),
		variant
	)
	if (opts.allowUnsafe) warn(problem)
	else throwBuildError(`${problem} ${allowUnsafeHint}`)
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
