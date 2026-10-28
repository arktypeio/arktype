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
	// a host asks the bundler only for an import isValueImport says may carry a value
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

// what a dependency's imports of arktype resolve to where it runs on arktype
export const islandDependencySpecifier = "arktype/internal/islandDependency.js"

export const runsOnArktype = (
	importer: string | undefined,
	dependencies: DependencyModes | undefined
): boolean => {
	const name = dependencyNameOf(importer)
	return !!name && dependencies?.[name] === "arktype"
}

const dependencyNameOf = (importer: string | undefined): string | undefined =>
	importer && dependencyOf(importer.split("?")[0])?.[1]

// from the innermost node_modules the file names a package in
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

// a leading .* would backtrack across a long path once per character
const nodeModulesSegment = /[/\\]node_modules(?=[/\\])/g

const packageInNodeModules =
	/[/\\]node_modules[/\\]((?:@[^/\\]+[/\\])?[^/\\]+)/y

// Vite writes / on Windows, and an entry keeps a symlink or 8.3 name like
// RUNNER~1 where its imports don't
export const fileOf = (id: string): string =>
	isAbsolute(id) ? realPathOf(id) : id

export const realPathOf = (path: string): string => {
	try {
		return realpathSync.native(path)
	} catch {
		return resolve(path)
	}
}

export const printablePathOf = (from: string, to: string): string =>
	relative(from, to).split(sep).join("/")

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

export type RuntimeVariant = "none" | "lean" | "none-lean"

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

// @ark/schema's constants for what a program's issues may hold, written again per build
export const issueFeaturesFile =
	/[/\\]@?ark[/\\]schema(?:[/\\]out)?[/\\]shared[/\\]issueFeatures\.[jt]s$/

export const writeIssueFeatures = (issues: IssueFeatures): string =>
	Object.entries(issues)
		.map(([name, holds]) => `export const ${name} = ${holds}\n`)
		.join("")

export const narrowsIssues = (issues: IssueFeatures | undefined): boolean =>
	!!issues && Object.values(issues).includes(false)

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

export const packageNameOf = (specifier: string): string =>
	specifier.split("/", specifier.startsWith("@") ? 2 : 1).join("/")

// arktype's own packages, which read their nodes and import the runtime by design
export const arkPackageName = /^(?:arktype|arkregex|arksets|@ark\/.+)$/

// e.g. @ark/json-schema, which reads arktype's nodes, so imports arktype rather than its runtime
export const readsNodes = (importer: string | undefined): boolean => {
	const name = dependencyNameOf(importer)
	return !!name && /^(?:arksets|@ark\/(?:json-schema|fast-check))$/.test(name)
}

// a dependency importing the runtime ships what another build precompiled
export const precompiledDependencyOf = (
	specifier: string,
	importer: string
): string | undefined => {
	const [, name] =
		(specifier === "arktype/runtime" && dependencyOf(importer)) || []
	return name && !arkPackageName.test(name) ? name : undefined
}

export interface EmittedMap {
	mappings: string
	sourcesContent?: (string | null)[]
}

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
