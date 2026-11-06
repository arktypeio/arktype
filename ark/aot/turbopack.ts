import { existsSync, readFileSync, realpathSync } from "node:fs"
import { createRequire } from "node:module"
import { basename, dirname, extname, join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { parseSync } from "oxc-parser"
import type {
	KeyedModule,
	KeyedPrecompiler,
	PrecompiledKeyedModule,
	PrecompilePluginOptions
} from "./driver.ts"
import { refuseDeclare } from "./declare.ts"
import {
	isArkFile,
	isInProgram,
	isProgramUnit,
	isSourceRead,
	programAnswerOf,
	programOf,
	type LoaderResolve,
	type ProgramAnswer,
	type ReadProgramDir
} from "./nextProgram.ts"
import { isProductionEnv, withEnvironment } from "./presets.ts"
import {
	refuseArktypeDependencies,
	refusePrune,
	resolvePrecompileOptions,
	settingsFileOf,
	withSettingsFile
} from "./settings.ts"
import {
	createNodeHost,
	createDevelopmentHost,
	dependencyOf,
	dependsOnArktype,
	packageRootOf,
	printablePathOf,
	realPathOf,
	reportDiagnostics,
	resolvedVariantOf,
	resolvesToRuntime,
	rethrowAsBuildError,
	runtimeSpecifiers,
	throwBuildError
} from "./host.ts"
import {
	writeAliasMessage,
	writeChangedSettingsMessage,
	writeExternalizedMessage,
	writeMissedByProgramMessage,
	writeNextExternalMessage,
	writeRuntimeAliasMessage,
	writeUnresolvedSchemaRuntimeMessage,
	writeUnreadServerExternalsMessage,
	withAllowUnsafe
} from "./messages.ts"
import { propertyKeyOf, walk } from "./scope.ts"
import { checkArktypeVersion } from "./version.ts"

export interface TurbopackLoaderContext {
	resourcePath: string
	// the Next.js project, which may not be the process's directory
	rootContext?: string
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

let driver: typeof import("./driver.ts") | undefined

// the driver imports arktype, so it's loaded once arktype is checked
const createKeyedPrecompiler = (
	opts: PrecompilePluginOptions
): KeyedPrecompiler => {
	if (!driver) {
		checkArktypeVersion()
		driver = createRequire(import.meta.url)(
			`./driver${extname(import.meta.url)}`
		) as typeof import("./driver.ts")
	}
	return driver.createKeyedPrecompiler(opts)
}

// ark.json is read once for each option set the loader is given
const resolvedByOptions: Record<string, PrecompilePluginOptions> = {}

// as each option set first read them, since arktype keeps what it compiled
// under them for the process
const settingsByOptions: Record<string, string> = {}

// with ark.json's, where prune: true would be ignored
const resolvedOptionsOf = (
	set: PrecompilePluginOptions,
	production: boolean
): PrecompilePluginOptions => {
	refuseArktypeDependencies(set, "Turbopack")
	return resolvePrecompileOptions(
		withEnvironment(
			// Next loads a route's modules at its first request, none written as one
			production ? { defers: "large", ...set } : set,
			{ production, testing: false }
		)
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
		const key = `${production}${JSON.stringify(given)}`
		const set = withSettingsFile(given)
		const settings = JSON.stringify(set)
		if ((settingsByOptions[key] ??= settings) !== settings) {
			const cwd = given.cwd ?? process.cwd()
			throwBuildError(
				writeChangedSettingsMessage(
					printablePathOf(cwd, settingsFileOf(cwd) ?? join(cwd, "ark.json"))
				)
			)
		}
		opts = resolvedByOptions[key] ??= resolvedOptionsOf(set, production)
	} catch (e) {
		return rethrowAsBuildError(e)
	}
	if (isRuntimeShim(this.resourcePath)) {
		try {
			return runtimeShimOf(this, opts)
		} catch (e) {
			return rethrowAsBuildError(e)
		}
	}
	const reads = readsProgram(this, opts)
	// as Vite's dev server does, `next dev` builds whole what `next build` prunes
	if (opts.prune === true && !reads && this.mode !== "development") {
		try {
			refusePrune(opts, "a loader outside `next build`")
		} catch (e) {
			return rethrowAsBuildError(e)
		}
	}
	const loaded =
		reads ?
			answerFromProgram(this, source, opts)
		:	answerAlone(this, source, opts)
	if (typeof loaded !== "object") return loaded
	const done = this.async!()
	loaded.then(code => done(null, code), done)
}

// what turbopack.resolveAlias loads for @ark/schema/runtime, in place of an
// alias to the entry the build's options load, which would differ between them
const runtimeShim = fileURLToPath(
	new URL(`./turbopackRuntime${extname(import.meta.url)}`, import.meta.url)
)

let realRuntimeShim: string | undefined

const isRuntimeShim = (path: string): boolean =>
	basename(path) === basename(runtimeShim) &&
	realPathOf(path) === (realRuntimeShim ??= realPathOf(runtimeShim))

// the copy of @ark/schema's runtime the build's options load, as arktype's
// resolves it, re-exported by a path no alias reaches
const runtimeShimOf = (
	context: TurbopackLoaderContext,
	opts: PrecompilePluginOptions
): string => {
	const host = createNodeHost(opts)
	const root = context.rootContext ?? opts.cwd ?? process.cwd()
	const runtime = host.resolve("arktype/runtime", join(root, "package.json"))
	const variant = resolvedVariantOf(opts)
	const entry =
		variant ? `@ark/schema/runtime/${variant}` : "@ark/schema/runtime"
	const resolved = runtime && host.resolve(entry, runtime)
	if (!resolved)
		return throwBuildError(writeUnresolvedSchemaRuntimeMessage(entry))
	const path = relative(
		dirname(realPathOf(context.resourcePath)),
		realPathOf(resolved)
	)
		.split(sep)
		.join("/")
	return `export * from ${JSON.stringify(path.startsWith(".") ? path : `./${path}`)}\n`
}

// `next build` reads its modules whole, through what Turbopack resolves, where
// `next dev` writes each as it's asked for
const readsProgram = (
	context: TurbopackLoaderContext,
	opts: PrecompilePluginOptions
): boolean =>
	context.mode === "production" &&
	opts.prune !== false &&
	opts.runtime !== "arktype" &&
	!opts.shadow &&
	!!context.async &&
	!!context.getResolve &&
	!!context.rootContext &&
	!!packageRootOf("next", context.rootContext)

const answerFromProgram = async (
	context: TurbopackLoaderContext,
	source: string,
	opts: PrecompilePluginOptions
): Promise<string | undefined> => {
	const id = context.resourcePath
	if (isProgramUnit(id)) return source
	const resolve = context.getResolve!({})
	const program = await programOf(context.rootContext!, opts, resolve)
	if (program.isReader) {
		for (const warning of program.warnings)
			context.emitWarning(new Error(warning))
	}
	if (program.refused) {
		if (opts.prune === true) throwBuildError(program.refused)
		if (program.isReader) context.emitWarning(new Error(program.refused))
		return answerAlone(context, source, opts)
	}
	const answer = programAnswerOf(program, id)
	// a dependency it leaves is checked as ever, and one it doesn't is a module
	// the read missed, whose reads it can't have planned for
	if (!answer) {
		if (dependencyOf(id) || isArkFile(id))
			return answerAlone(context, source, opts)
		throwBuildError(
			writeMissedByProgramMessage(
				printablePathOf(context.rootContext!, id),
				"is built"
			)
		)
	}
	if (!isSourceRead(answer!, source)) {
		throwBuildError(
			writeMissedByProgramMessage(
				printablePathOf(context.rootContext!, id),
				"reaches this loader rewritten"
			)
		)
	}
	await checkImports(context, program, answer!, resolve)
	return loadedOf(context, () => precompilerOf(opts), answer!, source, opts)
}

// Turbopack resolves a module's imports apart for each layer it builds it in,
// the read's for the one that asked first
const checkImports = async (
	context: TurbopackLoaderContext,
	program: ReadProgramDir,
	answer: ProgramAnswer,
	resolve: LoaderResolve
) => {
	const id = context.resourcePath
	await Promise.all(
		Object.entries(answer.imports).map(async ([specifier, read]) => {
			const resolved = await resolve(dirname(id), specifier).then(
				realPathOf,
				() => undefined
			)
			if (
				read ?
					resolved !== read
				:	resolved !== undefined && isInProgram(program, resolved)
			) {
				throwBuildError(
					writeMissedByProgramMessage(
						printablePathOf(context.rootContext!, id),
						`imports "${specifier}" as ${resolved === undefined ? "nothing" : printablePathOf(context.rootContext!, resolved)}`
					)
				)
			}
		})
	)
}

const precompilerOf = (opts: PrecompilePluginOptions) =>
	(precompilersByOptions[JSON.stringify(opts)] ??= createKeyedPrecompiler(opts))

const answerAlone = (
	context: TurbopackLoaderContext,
	source: string,
	opts: PrecompilePluginOptions
): string | undefined | Promise<string | undefined> => {
	const precompiler = precompilerOf(opts)
	let keyed: PrecompiledKeyedModule
	try {
		keyed = precompiler.precompile(source, context.resourcePath)
	} catch (e) {
		return rethrowAsBuildError(e)
	}
	const resolve = context.async && context.getResolve?.({})
	const precompilerRead = () => precompiler
	if (!keyed.unresolved.length || !resolve)
		return loadedOf(context, precompilerRead, keyed, source, opts)
	return resolvedAgain(
		precompiler,
		keyed,
		resolve,
		source,
		context.resourcePath
	).then(keyed => loadedOf(context, precompilerRead, keyed, source, opts))
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
	precompiler: () => KeyedPrecompiler,
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
			precompiler().readDependency(context.resourcePath),
			warn,
			throwBuildError
		)
	}
	if (!specifiers.length || !context.getResolve || !context.async) return code
	const resolve = context.getResolve({})
	return checkAliases(resolve, context.resourcePath, specifiers, opts, warn)
		.then(() => checkNextExternals(context, resolve, opts, warn))
		.then(() => code)
}

// Next.js decides what it leaves external after the resolver the loader has,
// and resolveAlias doesn't reach what it does
const checkNextExternals = async (
	context: TurbopackLoaderContext,
	resolve: (context: string, request: string) => Promise<string>,
	opts: PrecompilePluginOptions,
	warn: (warning: string) => void
) => {
	if (opts.runtime === "arktype" || opts.shadow) return
	const root = context.rootContext ?? opts.cwd ?? process.cwd()
	if (!packageRootOf("next", root)) return
	const problem =
		(serverExternalProblems[root] ??= serverExternalProblemOf(root)) ||
		// Next's own React is external just where this module's dependencies are,
		// however next.config comes to set bundlePagesRouterDependencies
		(await resolve(
			dirname(context.resourcePath),
			"next/dist/compiled/react"
		).then(
			() => "",
			() => writeNextExternalMessage("arktype")
		))
	if (!problem) return
	if (opts.allowUnsafe) warn(problem)
	else throwBuildError(withAllowUnsafe(problem))
}

const serverExternalProblems: Record<string, string> = {}

// read rather than run, as Next's own process alone expects to run next.config,
// which may start a server or write files
const serverExternalProblemOf = (root: string): string => {
	const name = nextConfigFiles.find(name => existsSync(join(root, name)))
	if (!name) return ""
	const source = readFileSync(join(root, name), "utf8")
	if (!source.includes("serverExternalPackages")) return ""
	const lists = serverExternalListsIn(name, source)
	if (!lists.length || lists.some(list => !list))
		return writeUnreadServerExternalsMessage(name)
	const external = (lists as string[][])
		.flat()
		.find(name => dependsOnArktype(name, root))
	return external ?
			writeExternalizedMessage(external, "serverExternalPackages")
		:	""
}

// each serverExternalPackages property's names, null where they aren't literal
const serverExternalListsIn = (name: string, source: string) => {
	const lists: (string[] | null)[] = []
	walk(parseSync(name, source).program, node => {
		if (
			node.type === "Property" &&
			!node.computed &&
			propertyKeyOf(node) === "serverExternalPackages"
		) {
			const { value } = node
			lists.push(
				(
					value.type === "ArrayExpression" &&
						value.elements.every(element => element?.type === "Literal")
				) ?
					value.elements.map(element =>
						String((element as { value?: unknown }).value)
					)
				:	null
			)
		}
		return true
	})
	return lists
}

// those next.config can be, which Next.js reads the first of
const nextConfigFiles = [
	"next.config.js",
	"next.config.mjs",
	"next.config.ts",
	"next.config.mts"
]

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
	// the runtime loads @ark/schema's, which the build may replace with a copy,
	// through the module the loader writes for its options
	const resolved = await resolve(dirname(runtime), "@ark/schema/runtime").catch(
		() => undefined
	)
	if (resolved === undefined || isRuntimeShim(resolved)) return
	const problem = writeRuntimeAliasMessage(
		printablePathOf(opts.cwd ?? process.cwd(), resolved)
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
