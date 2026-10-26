import { throwError } from "@ark/util"
import {
	decode,
	encode,
	type SourceMapMappings,
	type SourceMapSegment
} from "@jridgewell/sourcemap-codec"
import { existsSync, readFileSync, realpathSync } from "node:fs"
import {
	basename,
	dirname,
	isAbsolute,
	join,
	relative,
	resolve,
	sep
} from "node:path"
import type { IssueFeatures } from "arktype/internal/standalone.ts"
import { ResolverFactory, type NapiResolveOptions } from "oxc-resolver"
import type { PrecompilePluginOptions, RenderedDiagnostics } from "./driver.ts"
import type { PrecompileOptions } from "./precompile.ts"
import { isProductionEnv, withEnvironment } from "./presets.ts"

export interface PrecompileHost {
	// isValueImport, where given, says whether the import may carry a value,
	// as a Type is, which a host asking the bundler what it can't resolve
	// asks only for one that may
	resolve(
		specifier: string,
		importer: string,
		isValueImport?: () => boolean
	): string | undefined
	readFile(path: string): string | undefined
	// a host watches it, since its `paths` change what an import resolves to
	tsconfigOf?(importer: string): string | undefined
}

export interface NodeHostOptions {
	// export conditions to resolve with, in priority order
	conditions?: string[] | undefined
	// whose `paths` to follow, else found from each importer
	tsconfig?: string | undefined
}

const nodeConditions = ["import", "node", "default"]

export const createNodeHost = (opts?: NodeHostOptions): PrecompileHost => {
	const resolveOptions: NapiResolveOptions = {
		conditionNames: opts?.conditions ?? nodeConditions,
		extensions: [
			".ts",
			".tsx",
			".mts",
			".cts",
			".js",
			".jsx",
			".mjs",
			".cjs",
			".json"
		],
		extensionAlias: {
			".js": [".ts", ".tsx", ".js"],
			".jsx": [".tsx", ".jsx"],
			".mjs": [".mts", ".mjs"],
			".cjs": [".cts", ".cjs"]
		}
	}
	const resolver = new ResolverFactory({
		...resolveOptions,
		tsconfig:
			opts?.tsconfig ?
				{ configFile: opts.tsconfig, references: "auto" }
			:	"auto"
	})
	let resolverWithoutTsconfig: ResolverFactory | undefined
	const tsconfigsByDir: Record<string, string | undefined> = {}
	const tsconfigIn = (dir: string): string | undefined => {
		if (dir in tsconfigsByDir) return tsconfigsByDir[dir]
		const tsconfig = join(dir, "tsconfig.json")
		return (tsconfigsByDir[dir] =
			existsSync(tsconfig) ? tsconfig
			: dir === dirname(dir) ? undefined
			: tsconfigIn(dirname(dir)))
	}
	return {
		resolve: (specifier, importer) => {
			if (!isAbsolute(importer)) return
			let result = resolver.resolveFileSync(importer, specifier)
			// a tsconfig the resolver can't load fails every resolution
			if (result.error && /tsconfig/i.test(result.error)) {
				resolverWithoutTsconfig ??= resolver.cloneWithOptions(resolveOptions)
				result = resolverWithoutTsconfig.resolveFileSync(importer, specifier)
			}
			// it keeps an importer's 8.3 names, which another importer may not have
			return result.path && realPathOf(result.path)
		},
		readFile,
		tsconfigOf: importer =>
			opts?.tsconfig ??
			(isAbsolute(importer) ? tsconfigIn(dirname(importer)) : undefined)
	}
}

// a development build's, whose arktype/runtime has Node print errors as issues
export const createDevelopmentHost = (opts?: NodeHostOptions): PrecompileHost =>
	createNodeHost({
		...opts,
		conditions: [...(opts?.conditions ?? nodeConditions), "development"]
	})

export const readFile = (path: string): string | undefined =>
	existsSync(path) ? readFileSync(path, "utf8") : undefined

// `"ark": { "aot": true }`
export const optsIn = (manifest: string | undefined): boolean =>
	manifest !== undefined && JSON.parse(manifest).ark?.aot === true

export type DependencyMode = "aot" | "arktype"

export type DependencyModes = Record<string, DependencyMode>

// what a dependency's imports of arktype resolve to where it runs on
// arktype, as a runtime island's do
export const islandDependencySpecifier = "arktype/internal/islandDependency.js"

// a dependency the program's settings run on arktype
export const runsOnArktype = (
	importer: string | undefined,
	dependencies: DependencyModes | undefined
): boolean => {
	const [, name] = (importer && dependencyOf(importer.split("?")[0])) || []
	return !!name && dependencies?.[name] === "arktype"
}

// the package in node_modules a file belongs to, if any, from the innermost
// node_modules it names one in
export const dependencyOf = (
	file: string
): [root: string, name: string] | undefined => {
	const starts = [...file.matchAll(nodeModulesSegment)]
	for (let i = starts.length - 1; i >= 0; i--) {
		packageInNodeModules.lastIndex = starts[i].index
		const match = packageInNodeModules.exec(file)
		if (match) {
			return [
				file.slice(0, packageInNodeModules.lastIndex),
				match[1].replace("\\", "/")
			]
		}
	}
}

// read from each start rather than through a leading .*, which backtracks
// across a long path once for every character
const nodeModulesSegment = /[/\\]node_modules(?=[/\\])/g

const packageInNodeModules =
	/[/\\]node_modules[/\\]((?:@[^/\\]+[/\\])?[^/\\]+)/y

// a module's file as the resolver writes it. Vite writes / on Windows, and
// an entry under a root given through a symlink or an 8.3 name like RUNNER~1
// keeps that form, where the modules it imports don't
export const fileOf = (id: string): string =>
	isAbsolute(id) ? realPathOf(id) : id

// a path as the resolver writes it, through symlinks and 8.3 names
export const realPathOf = (path: string): string => {
	try {
		return realpathSync.native(path)
	} catch {
		return resolve(path)
	}
}

// a path as messages print it, with / on every platform
export const printablePathOf = (from: string, to: string): string =>
	relative(from, to).split(sep).join("/")

// the directory of the nearest package.json
export const projectOf = (cwd: string): string => {
	let project = cwd
	while (
		!existsSync(join(project, "package.json")) &&
		project !== dirname(project)
	)
		project = dirname(project)
	return project
}

// for a host that must be told before the build which packages it transforms
export const optedInPackagesOf = (
	cwd: string,
	dependencies?: DependencyModes
): string[] => {
	const result = Object.keys(dependencies ?? {}).filter(
		name => dependencies![name] === "aot"
	)
	const project = projectOf(cwd)
	// every package the project reaches, as one that doesn't opt in may depend on one that does
	const packages: [root: string, name: string][] = [[project, ""]]
	const visited = new Set([realPathOf(project)])
	for (let i = 0; i < packages.length; i++) {
		const [root, name] = packages[i]
		const manifest = readFile(join(root, "package.json"))
		if (manifest === undefined) continue
		if (i && optsIn(manifest) && !result.includes(name)) result.push(name)
		const {
			dependencies,
			devDependencies,
			optionalDependencies,
			peerDependencies
		} = JSON.parse(manifest)
		for (const dependency in {
			...dependencies,
			// a dependency's devDependencies aren't installed
			...(!i && devDependencies),
			...optionalDependencies,
			...peerDependencies
		}) {
			const dependencyRoot = packageRootOf(dependency, root)
			if (dependencyRoot && !visited.has(dependencyRoot)) {
				visited.add(dependencyRoot)
				packages.push([dependencyRoot, dependency])
			}
		}
	}
	return result
}

// where Node finds a package imported from a directory
export const packageRootOf = (
	name: string,
	from: string
): string | undefined => {
	for (let dir = from; ; dir = dirname(dir)) {
		const root = join(dir, "node_modules", name)
		if (
			basename(dir) !== "node_modules" &&
			existsSync(join(root, "package.json"))
		)
			return realPathOf(root)
		if (dir === dirname(dir)) return
	}
}

// a host without a channel for source maps reads one from the code
export const appendSourceMap = (
	code: string,
	map: object | undefined
): string =>
	map ?
		`${code}\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(JSON.stringify(map)).toString("base64")}`
	:	code

// arktype's entries
export const runtimeSpecifiers = [
	"arktype",
	"arktype/codecs",
	"arktype/config",
	"arktype/errors",
	"arktype/mutatesInput"
]

// what arktype/runtime loads, and arksets, which arktype's parser loads
export const runtimePackages = [
	"arktype",
	"arksets",
	"@ark/schema",
	"@ark/util"
]

// shadow mode keeps arktype, resolving only its config to the runtime
export const resolvesToRuntime = (
	specifier: string,
	opts: PrecompileOptions | undefined
): boolean =>
	opts?.runtime !== "arktype" &&
	!(opts?.shadow && specifier !== "arktype/config")

// a copy of @ark/schema's runtime with errors of its own
export type RuntimeVariant = "none" | "lean" | "none-lean"

// errors "none", or errors written for size
export const runtimeVariantOf = (
	opts: PrecompileOptions | undefined
): RuntimeVariant | undefined =>
	opts?.optimizeErrors === "size" ?
		opts.errors === "none" ?
			"none-lean"
		:	"lean"
	: opts?.errors === "none" ? "none"
	: undefined

// loaded in place of @ark/schema's runtime, but not in shadow mode
export const resolvedVariantOf = (
	opts: PrecompileOptions | undefined
): RuntimeVariant | undefined =>
	opts?.runtime === "arktype" || opts?.shadow ?
		undefined
	:	runtimeVariantOf(opts)

export const schemaSpecifier = /^@ark\/schema(?:\/|$)/

// only the runtime has a copy, as other entries load the errors it replaces
export const variantSpecifierOf = (
	specifier: string,
	variant: RuntimeVariant
): string | undefined =>
	(
		specifier === "@ark/schema/runtime" ||
		specifier === `@ark/schema/runtime/${variant}`
	) ?
		`@ark/schema/runtime/${variant}`
	:	undefined

// @ark/schema's constants for what a program's issues may hold, which a build
// reading each of its validators writes again
export const issueFeaturesFile =
	/[/\\]@?ark[/\\]schema(?:[/\\]out)?[/\\]shared[/\\]issueFeatures\.[jt]s$/

export const writeIssueFeatures = (issues: IssueFeatures): string =>
	Object.entries(issues)
		.map(([name, holds]) => `export const ${name} = ${holds}\n`)
		.join("")

// whether a build drops what reads a feature none of its issues hold
export const narrowsIssues = (issues: IssueFeatures | undefined): boolean =>
	!!issues && Object.values(issues).includes(false)

export const writeVariantOption = (variant: RuntimeVariant): string =>
	variant === "lean" ? 'optimizeErrors: "size"' : 'errors: "none"'

export const writeVariantImportMessage = (
	importer: string,
	specifier: string,
	variant: RuntimeVariant
): string =>
	`${importer} imports ${specifier}, which a build with ${writeVariantOption(variant)} can't load beside its runtime, a copy of @ark/schema's whose errors are a class of their own. Import what it reads from arktype, which a standalone build resolves to that runtime, or build ${variant === "lean" ? 'with optimizeErrors: "speed"' : `without ${writeVariantOption(variant)}`}.`

// not a virtual module like Rolldown's `\0rolldown/runtime.js`
export const transformedId = /^[^\0].*\.(?:[cm]?[jt]s|[jt]sx)$/

export const transformedFilterOf = (
	packages: string[]
): { include: RegExp; exclude: RegExp } => ({
	include: transformedId,
	// node_modules, unless the innermost package there opts in
	exclude:
		packages.length ?
			new RegExp(
				`[/\\\\]node_modules[/\\\\](?!(?:${packages.map(name => name.replace(/\./g, "\\.").replace("/", "[/\\\\]")).join("|")})[/\\\\])(?!.*[/\\\\]node_modules[/\\\\])`
			)
		:	/[/\\]node_modules[/\\]/
})

export const writeTextlessMessage = (path: string): string =>
	`${path} imports arktype but was loaded without @ark/aot/node's hooks, before register() ran or by a loader that compiles it itself, as tsx does in a CommonJS package, so a standalone build can't precompile it. Register them first, as with \`node --import ./register.ts\`, and let Node run the TypeScript rather than a loader like tsx.`

export const driverOptionsOf = (
	opts: PrecompilePluginOptions,
	isTestRunner: boolean
): PrecompilePluginOptions => ({
	...withEnvironment(opts, {
		production: isProductionEnv(),
		testing: isTestRunner
	}),
	// a standalone module imports what it shares, which the driver serves
	inline: opts.runtime === "arktype"
})

export const reportDiagnostics = (
	diagnostics: RenderedDiagnostics | undefined,
	warn: (warning: string) => void,
	fail: (message: string) => never = throwError
): void => {
	for (const warning of diagnostics?.warnings ?? []) warn(warning)
	if (diagnostics?.errors.length) fail(diagnostics.errors.join("\n"))
}

// what the precompiler throws to say what it can't build, not a crash
export const isBuildError = (e: unknown): e is Error =>
	e instanceof Error && (e.name === "Error" || e.name === "ParseError")

// a bundler prints an error's stack, which would show the precompiler's frames
export const rethrowAsBuildError = (e: unknown): never => {
	if (isBuildError(e)) e.stack = ""
	throw e
}

export const throwBuildError = (message: string): never =>
	rethrowAsBuildError(new Error(message))

export const writeUncachedModuleMessage = (
	specifier: string,
	dir: string
): string =>
	`${specifier} was written by a build whose cache kept it in ${dir}, where it no longer is. Delete the bundler's cache to rebuild it.`

// e.g. "@ark/schema" for "@ark/schema/runtime"
export const packageNameOf = (specifier: string): string =>
	specifier.split("/", specifier.startsWith("@") ? 2 : 1).join("/")

export const writeExternalizedMessage = (
	specifier: string,
	option: string
): string =>
	`The build's \`${option}\` option leaves ${specifier} to be loaded at runtime rather than bundled with the runtime the program's precompiled validators use, so the program can load a copy of arktype that isn't theirs, e.g. one whose \`type.errors\` isn't the class of their errors. Remove ${packageNameOf(specifier)} from \`${option}\`.`

export const writeUnwrittenModuleMessage = (specifier: string): string =>
	`${specifier} is imported by a module this build didn't precompile, as one a cache kept from an earlier build is. Keep that cache from storing the modules @ark/aot transforms, or delete it.`

// `resolved` is where it resolves other than to arktype/runtime
export const writeAliasMessage = (
	specifier: string,
	resolved: string | undefined,
	opts: PrecompilePluginOptions | undefined
): string =>
	resolved === undefined ?
		`${specifier} resolves to arktype/runtime, where defining a Type throws. Remove its turbopack.resolveAlias, which ${opts?.shadow ? "shadow mode" : 'runtime: "arktype"'} doesn't use.`
	:	`${specifier} resolves to ${resolved} rather than arktype/runtime, where a standalone build's validators run. Add to turbopack.resolveAlias: ${JSON.stringify(
			Object.fromEntries(
				runtimeSpecifiers
					.filter(
						s =>
							packageNameOf(s) === packageNameOf(specifier) &&
							resolvesToRuntime(s, opts)
					)
					.map(s => [s, "arktype/runtime"])
			)
		)}`

// `resolved` is where @ark/schema/runtime resolves other than to the build's copy
export const writeRuntimeAliasMessage = (
	resolved: string,
	variant: RuntimeVariant | undefined
): string =>
	variant ?
		`@ark/schema/runtime resolves to ${resolved} rather than @ark/schema/runtime/${variant}, which a build with ${writeVariantOption(variant)} loads in its place. Add to turbopack.resolveAlias: ${JSON.stringify({ "@ark/schema/runtime": `@ark/schema/runtime/${variant}` })}, and install @ark/schema if your package manager doesn't hoist it, as pnpm doesn't.`
	:	`@ark/schema/runtime resolves to ${resolved}, a copy for a build with errors: "none" or optimizeErrors: "size". Remove its turbopack.resolveAlias.`

export const writeNodeVersionMessage = (
	name: string,
	version: string
): string =>
	`${name} needs Node ${version} or later (this is ${process.versions.node})`

export const unbundledMessage =
	"precompile.esbuild() needs bundle: true, as a precompiled module imports the validators the bundle includes"

// arktype's own packages, which read their nodes and import the runtime by design
export const arkPackageName = /^(?:arktype|arkregex|arksets|@ark\/.+)$/

// e.g. @ark/json-schema, which reads arktype's nodes where a runtime island
// calls it, so it imports arktype itself rather than its runtime
export const readsNodes = (importer: string | undefined): boolean => {
	const [, name] = (importer && dependencyOf(importer.split("?")[0])) || []
	return !!name && /^(?:arksets|@ark\/(?:json-schema|fast-check))$/.test(name)
}

// the fix, then the escape hatch, as in "Remove it, or set allowUnsafe: ..."
export const withAllowUnsafe = (fix: string): string =>
	`${fix.replace(/\.$/, "")}, or set allowUnsafe: true to build anyway, with a warning.`

// a dependency importing the runtime ships what another build precompiled
export const precompiledDependencyOf = (
	specifier: string,
	importer: string
): string | undefined => {
	const [, name] =
		(specifier === "arktype/runtime" && dependencyOf(importer)) || []
	return name && !arkPackageName.test(name) ? name : undefined
}

export const writePrecompiledDependencyMessage = (name: string): string =>
	`${name} imports arktype/runtime, so it ships validators precompiled for one version of arktype, which may not be this build's. Have it publish its source with "ark": { "aot": true } in its package.json, so this build precompiles it.`

export const writeUntransformedImportMessage = (
	file: string,
	specifier: string,
	cwd: string
): string =>
	writeUnprecompiledMessage(
		printablePathOf(cwd, file),
		specifier,
		"it can't precompile a module that isn't JavaScript or TypeScript. Move what it reads off arktype into a .ts module it imports: define its Types there, and check for errors with a function exported from there, like `export const isInvalid = (out: unknown) => out instanceof type.errors`."
	)

// e.g. esbuild's stdin, or a module a plugin loads from a virtual id
export const writeFilelessImportMessage = (
	id: string,
	specifier: string
): string =>
	writeUnprecompiledMessage(
		id.replace(/^\0/, ""),
		specifier,
		"it can't precompile a module with no file of its own. Define the Types it uses in a file it imports."
	)

// esbuild loads a module with the first plugin that returns its contents
export const writeLoadedFirstMessage = (
	file: string,
	specifier: string,
	cwd: string
): string =>
	writeUnprecompiledMessage(
		printablePathOf(cwd, file),
		specifier,
		"another plugin loaded it before precompile.esbuild() could. Put precompile.esbuild() ahead of that plugin."
	)

const writeUnprecompiledMessage = (
	name: string,
	specifier: string,
	reason: string
) =>
	`${name} imports ${specifier}, which a standalone build resolves to arktype/runtime, where defining a Type throws, as ${reason}`

export interface EmittedMap {
	mappings: string
	sourcesContent?: (string | null)[]
}

// a map to the precompiled module, as tsc's or the linker's, traced to the source
export const mapToSource = (
	emitted: EmittedMap,
	precompiled: EmittedMap | undefined,
	source: string
): EmittedMap => {
	if (!precompiled) return emitted
	const lines = decode(precompiled.mappings)
	const mappings: SourceMapMappings = decode(emitted.mappings).map(line =>
		line.flatMap((segment): SourceMapSegment[] => {
			if (segment.length === 1) return [segment]
			const [column, sourceIndex, sourceLine, sourceColumn] = segment
			const original = segmentAt(lines[sourceLine], sourceColumn)
			// what the precompiler wrote maps to no line of the source
			if (!original) return []
			const traced: SourceMapSegment = [
				column,
				sourceIndex,
				original[2],
				original[3] + sourceColumn - original[0]
			]
			return [segment.length === 5 ? [...traced, segment[4]] : traced]
		})
	)
	return {
		...emitted,
		mappings: encode(mappings),
		...(emitted.sourcesContent && { sourcesContent: [source] })
	}
}

// the last segment starting at or before the column, sorted by column
const segmentAt = (
	line: SourceMapSegment[] | undefined,
	column: number
): [number, number, number, number] | undefined => {
	let mapped: SourceMapSegment | undefined
	for (const segment of line ?? []) {
		if (segment[0] > column) break
		mapped = segment
	}
	return mapped?.length === 1 ? undefined : (mapped as never)
}
