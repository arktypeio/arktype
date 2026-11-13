import { throwError } from "@ark/util"
import {
	decode,
	encode,
	type SourceMapMappings,
	type SourceMapSegment
} from "@jridgewell/sourcemap-codec"
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs"
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

export const scriptExtensions = [
	".ts",
	".tsx",
	".mts",
	".cts",
	".js",
	".jsx",
	".mjs",
	".cjs"
]

const isRelativeOrAbsolute = (specifier: string): boolean =>
	/^\.{0,2}\//.test(specifier) || isAbsolute(specifier)

export const createNodeHost = (opts?: NodeHostOptions): PrecompileHost => {
	const resolveOptions: NapiResolveOptions = {
		conditionNames: opts?.conditions ?? nodeConditions,
		extensions: [...scriptExtensions, ".json"],
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
	// each tsconfig's resolver for a file its `include` leaves out
	const resolversByTsconfig: Record<string, ResolverFactory> = {}
	// the resolver keeps what it found of a file, there or not, for as long as
	// it lives, so an answer is kept as long: following a program's validators
	// asks for the same one thousands of times, each a realpath
	const resolved = new Map<string, string | undefined>()
	const resolve = (specifier: string, importer: string): string | undefined => {
		if (!isAbsolute(importer)) return
		let result = resolver.resolveFileSync(importer, specifier)
		// a tsconfig the resolver can't load fails every resolution
		if (result.error && /tsconfig/i.test(result.error)) {
			resolverWithoutTsconfig ??= resolver.cloneWithOptions(resolveOptions)
			result = resolverWithoutTsconfig.resolveFileSync(importer, specifier)
		}
		// e.g. `@app/schemas` from tests/user.test.ts, where tsconfig.json
		// includes only src: TypeScript applies its `paths` to no file outside
		// `include`, but esbuild, Bun and a bundler's alias for the same
		// names apply them to every file under it, so the nearest's are tried
		if (!result.path && !opts?.tsconfig && !isRelativeOrAbsolute(specifier)) {
			const tsconfig = tsconfigIn(dirname(importer))
			if (tsconfig) {
				try {
					// a resolver of its own, as a clone shares what the first found
					const outside = (resolversByTsconfig[tsconfig] ??=
						new ResolverFactory({
							...resolveOptions,
							tsconfig: { configFile: tsconfig, references: "auto" }
						})).resolveFileSync(importer, specifier)
					if (outside.path) result = outside
				} catch {
					// one it can't load, which resolves nothing
				}
			}
		}
		// it keeps an importer's 8.3 names, which another importer may not have
		return result.path && realPathOf(result.path)
	}
	return {
		resolve: (specifier, importer) => {
			const key = `${importer}\0${specifier}`
			if (!resolved.has(key)) resolved.set(key, resolve(specifier, importer))
			return resolved.get(key)
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

// each package a root reaches through what it declares, with its manifest
const reachedFrom = function* (
	start: string,
	name: string,
	readsDevDependencies: boolean,
	leaves: readonly string[] = []
): Generator<[root: string, name: string, manifest: string]> {
	const packages: [root: string, name: string][] = [[start, name]]
	const visited = new Set([realPathOf(start)])
	for (let i = 0; i < packages.length; i++) {
		const [root, name] = packages[i]
		const manifest = readFile(join(root, "package.json"))
		if (manifest === undefined) continue
		yield [root, name, manifest]
		const {
			dependencies,
			devDependencies,
			optionalDependencies,
			peerDependencies
		} = JSON.parse(manifest)
		for (const dependency in {
			...dependencies,
			// a dependency's devDependencies aren't installed
			...(!i && readsDevDependencies && devDependencies),
			...optionalDependencies,
			...peerDependencies
		}) {
			if (leaves.includes(dependency)) continue
			const dependencyRoot = packageRootOf(dependency, root)
			if (dependencyRoot && !visited.has(dependencyRoot)) {
				visited.add(dependencyRoot)
				packages.push([dependencyRoot, dependency])
			}
		}
	}
}

// for a host that must be told before the build which packages it transforms
export const optedInPackagesOf = (
	cwd: string,
	dependencies?: DependencyModes
): string[] => {
	const result = Object.keys(dependencies ?? {}).filter(
		name => dependencies![name] === "aot"
	)
	// every package the project reaches, as one that doesn't opt in may depend on one that does
	for (const [, name, manifest] of reachedFrom(projectOf(cwd), "", true))
		if (name && optsIn(manifest) && !result.includes(name)) result.push(name)
	return result
}

const arktypeEntries = ["arktype", "@ark/schema"]

// as an import, not as the vendor name a package compares a schema's to
const importOfArktype =
	/(?:\bfrom\s*|\bimport\s*\(?\s*|require\s*\(\s*)["'`](?:arktype|@ark\/schema)(?:\/[^"'`]*)?["'`]/

const importsArktype = (dir: string): boolean =>
	readdirSync(dir, { withFileTypes: true }).some(entry =>
		entry.isDirectory() ?
			entry.name !== "node_modules" && importsArktype(join(dir, entry.name))
		:	/\.[cm]?js$/.test(entry.name) &&
			importOfArktype.test(readFile(join(dir, entry.name)) ?? "")
	)

// a package left to Node loads what it imports from Node, so it may load
// arktype. Its manifest only says whose code to read, as many declare arktype
// without importing it, to read a Type they're passed, like @orpc/arktype.
// For a package left external by name, whichever of its subpaths is imported
export const dependsOnArktype = (name: string, from: string): boolean => {
	const start = packageRootOf(name, from)
	if (!start) return false
	if (arktypeEntries.includes(name)) return true
	for (const [root, , manifest] of reachedFrom(
		start,
		name,
		false,
		arktypeEntries
	)) {
		if (
			arktypeEntries.some(entry => manifest.includes(`"${entry}"`)) &&
			importsArktype(root)
		)
			return true
	}
	return false
}

// each import, or a call that may import anything, with no specifier
const importOrComputed =
	/(?:\bfrom\s*|\bimport\s*\(?\s*|require\s*\(\s*)["'`]([^\s"$'`]+)["'`]|\bimport\s*\(|require\s*\(/g

let nodeHost: PrecompileHost | undefined

// each module a specifier loads that imports arktype or computes what it loads,
// as a package may import it only from a subpath the program doesn't, like
// t3-env's presets-arktype: none where it can't load arktype, and the specifier
// where its modules can't be read
export const modulesLoadingArktype = (
	specifier: string,
	from: string
): string[] => {
	const name = packageNameOf(specifier)
	if (!dependsOnArktype(name, from)) return []
	if (arktypeEntries.includes(name)) return [specifier]
	const host = (nodeHost ??= createNodeHost())
	const entry = host.resolve(specifier, join(from, "_"))
	if (!entry) return [specifier]
	const modules = new Set<string>()
	const seen = new Set<string>()
	const read = (file: string) => {
		if (seen.has(file)) return
		seen.add(file)
		for (const [, imported] of (host.readFile(file) ?? "").matchAll(
			importOrComputed
		)) {
			if (!imported || arktypeEntries.includes(packageNameOf(imported)))
				modules.add(file)
			else {
				const resolved = host.resolve(imported, file)
				if (resolved) read(resolved)
			}
		}
	}
	read(entry)
	return [...modules]
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

export const specifierOf = (importer: string, file: string): string => {
	const path = relative(dirname(importer), file).split("\\").join("/")
	return path.startsWith(".") ? path : `./${path}`
}
