import { throwError } from "@ark/util"
import { existsSync, readFileSync, realpathSync } from "node:fs"
import { dirname, isAbsolute, join } from "node:path"
import type { SourceMap } from "magic-string"
import { ResolverFactory, type NapiResolveOptions } from "oxc-resolver"
import type { PrecompilePluginOptions, RenderedDiagnostics } from "./driver.ts"
import type { PrecompileOptions } from "./precompile.ts"

export interface PrecompileHost {
	resolve(specifier: string, importer: string): string | undefined
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

export const createNodeHost = (opts?: NodeHostOptions): PrecompileHost => {
	const resolveOptions: NapiResolveOptions = {
		conditionNames: opts?.conditions ?? ["import", "node", "default"],
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
			const result = resolver.resolveFileSync(importer, specifier)
			if (!result.error || !/tsconfig/i.test(result.error)) return result.path
			// a tsconfig the resolver can't load fails every resolution
			resolverWithoutTsconfig ??= resolver.cloneWithOptions(resolveOptions)
			return resolverWithoutTsconfig.resolveFileSync(importer, specifier).path
		},
		readFile,
		tsconfigOf: importer =>
			opts?.tsconfig ??
			(isAbsolute(importer) ? tsconfigIn(dirname(importer)) : undefined)
	}
}

const readFile = (path: string) =>
	existsSync(path) ? readFileSync(path, "utf8") : undefined

// e.g. `"arktype": { "precompile": true }`
export const optsIn = (manifest: string | undefined): boolean =>
	manifest !== undefined && JSON.parse(manifest).arktype?.precompile === true

// the package in node_modules a file belongs to, if any
export const dependencyOf = (
	file: string
): [root: string, name: string] | undefined => {
	const match =
		file.includes("/node_modules/") &&
		/.*\/node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(file)
	return match ? [match[0], match[1]] : undefined
}

// for a host that must be told before the build which packages it transforms
export const optedInPackagesOf = (cwd: string): string[] => {
	const result: string[] = []
	let project = cwd
	while (
		!existsSync(join(project, "package.json")) &&
		project !== dirname(project)
	)
		project = dirname(project)
	// the project, then each opted-in package, as its dependencies may opt in
	const roots = [project]
	for (let i = 0; i < roots.length; i++) {
		const manifest = readFile(join(roots[i], "package.json"))
		if (manifest === undefined) continue
		const {
			dependencies,
			devDependencies,
			optionalDependencies,
			peerDependencies
		} = JSON.parse(manifest)
		for (const name in {
			...dependencies,
			...devDependencies,
			...optionalDependencies,
			...peerDependencies
		}) {
			if (result.includes(name)) continue
			const root = packageRootOf(name, roots[i])
			if (root && optsIn(readFile(join(root, "package.json")))) {
				result.push(name)
				roots.push(root)
			}
		}
	}
	return result
}

// where Node finds a package imported from a directory
const packageRootOf = (name: string, from: string): string | undefined => {
	for (let dir = from; ; dir = dirname(dir)) {
		const root = join(dir, "node_modules", name)
		if (existsSync(join(root, "package.json"))) return realpathSync(root)
		if (dir === dirname(dir)) return
	}
}

// a host without a channel for source maps reads one from the code
export const appendSourceMap = (
	code: string,
	map: SourceMap | undefined
): string =>
	map ?
		`${code}\n//# sourceMappingURL=data:application/json;base64,${Buffer.from(JSON.stringify(map)).toString("base64")}`
	:	code

export const runtimeSpecifiers = [
	"arktype",
	"arktype/config",
	"arktype/errors",
	"arktype/mutatesInput"
]

// shadow mode keeps arktype, resolving only its config to the runtime
export const resolvesToRuntime = (
	specifier: string,
	opts: PrecompileOptions | undefined
): boolean =>
	opts?.runtime !== "arktype" &&
	!(opts?.shadow && specifier !== "arktype/config")

// errors "none" runs on a runtime of its own, but not in shadow mode
export const resolvesUndetailed = (
	opts: PrecompileOptions | undefined
): boolean =>
	opts?.errors === "none" && opts.runtime !== "arktype" && !opts.shadow

export const schemaSpecifier = /^@ark\/schema(?:\/|$)/

// only the runtime has a copy, as other entries load the errors it replaces
export const undetailedSpecifierOf = (specifier: string): string | undefined =>
	specifier === "@ark/schema/runtime" ? "@ark/schema/runtime/none"
	: specifier === "@ark/schema/runtime/none" ? specifier
	: undefined

export const writeUndetailedImportMessage = (
	importer: string,
	specifier: string
): string =>
	`${importer} imports ${specifier}, which a build with errors: "none" can't load beside its runtime, a copy of @ark/schema's whose errors are a class of their own`

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
				`/node_modules/(?!(?:${packages.map(name => name.replace(/\./g, "\\.")).join("|")})/)(?!.*/node_modules/)`
			)
		:	/\/node_modules\//
})

export const writeTextlessMessage = (path: string): string =>
	`${path} imports arktype but was loaded without @ark/precompile/node's hooks, before register() ran or by a loader that compiles it itself, as tsx does in a CommonJS package, so a standalone build can't precompile it`

export const driverOptionsOf = (
	opts: PrecompilePluginOptions | undefined,
	isTestRunner: boolean
): PrecompilePluginOptions => {
	const isStandalone = opts?.runtime !== "arktype"
	return {
		...opts,
		// a standalone module imports what it shares, which the driver serves
		inline: !isStandalone,
		checks:
			opts?.checks ?? (isStandalone && isTestRunner ? "helpers" : undefined)
	}
}

export const reportDiagnostics = (
	diagnostics: RenderedDiagnostics | undefined,
	warn: (warning: string) => void,
	fail: (message: string) => never = throwError
): void => {
	for (const warning of diagnostics?.warnings ?? []) warn(warning)
	if (diagnostics?.errors.length) fail(diagnostics.errors.join("\n"))
}

// a bundler prints an error's stack, which would show the precompiler's frames
export const throwBuildError = (message: string): never => {
	const error = new Error(message)
	error.stack = ""
	throw error
}

export const writeUncachedModuleMessage = (
	specifier: string,
	dir: string
): string =>
	`${specifier} was written by a build whose cache kept it in ${dir}, where it no longer is. Delete the bundler's cache to rebuild it.`

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
					.filter(s => resolvesToRuntime(s, opts))
					.map(s => [s, "arktype/runtime"])
			)
		)}`

export const writeNodeVersionMessage = (
	name: string,
	version: string
): string =>
	`${name} needs Node ${version} or later (this is ${process.versions.node})`
