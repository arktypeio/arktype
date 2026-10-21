import { throwError } from "@ark/util"
import { existsSync, readFileSync, realpathSync } from "node:fs"
import { basename, dirname, isAbsolute, join, relative } from "node:path"
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
	// every package the project reaches, as one that doesn't opt in may depend on one that does
	const packages: [root: string, name: string][] = [[project, ""]]
	const visited = new Set([realpathSync.native(project)])
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
const packageRootOf = (name: string, from: string): string | undefined => {
	for (let dir = from; ; dir = dirname(dir)) {
		const root = join(dir, "node_modules", name)
		if (
			basename(dir) !== "node_modules" &&
			existsSync(join(root, "package.json"))
		)
			return realpathSync.native(root)
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
	"arktype/codecs",
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

// a copy of @ark/schema's runtime with errors of its own
export type RuntimeVariant = "none" | "lean" | "none-lean"

// errors "none", or errors lacking methods
export const runtimeVariantOf = (
	opts: PrecompileOptions | undefined
): RuntimeVariant | undefined =>
	opts?.members?.errorMethods === false ?
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

export const writeVariantOption = (variant: RuntimeVariant): string =>
	variant === "lean" ? "members: { errorMethods: false }" : 'errors: "none"'

export const writeVariantImportMessage = (
	importer: string,
	specifier: string,
	variant: RuntimeVariant
): string =>
	`${importer} imports ${specifier}, which a build with ${writeVariantOption(variant)} can't load beside its runtime, a copy of @ark/schema's whose errors are a class of their own`

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

// `resolved` is where @ark/schema/runtime resolves other than to the build's copy
export const writeRuntimeAliasMessage = (
	resolved: string,
	variant: RuntimeVariant | undefined
): string =>
	variant ?
		`@ark/schema/runtime resolves to ${resolved} rather than @ark/schema/runtime/${variant}, which a build with ${writeVariantOption(variant)} loads in its place. Add to turbopack.resolveAlias: ${JSON.stringify({ "@ark/schema/runtime": `@ark/schema/runtime/${variant}` })}, and install @ark/schema if your package manager doesn't hoist it, as pnpm doesn't.`
	:	`@ark/schema/runtime resolves to ${resolved}, a copy for a build with errors: "none" or members: { errorMethods: false }. Remove its turbopack.resolveAlias.`

export const writeNodeVersionMessage = (
	name: string,
	version: string
): string =>
	`${name} needs Node ${version} or later (this is ${process.versions.node})`

export const unbundledMessage =
	"precompile.esbuild() needs bundle: true, as a precompiled module imports the validators the bundle includes"

// arktype's own packages, which read their nodes and import the runtime by design
export const arkPackageName = /^(?:arktype|arkregex|arksets|@ark\/.+)$/

export const allowUnsafeHint =
	"Set allowUnsafe: true to build anyway, with a warning."

export const writePrecompiledDependencyMessage = (name: string): string =>
	`${name} imports arktype/runtime, so it ships validators precompiled for one version of arktype, which may not be this build's. Have it publish its source with "arktype": { "precompile": true } in its package.json, so this build precompiles it.`

export const writeUntransformedImportMessage = (
	file: string,
	specifier: string,
	cwd: string
): string =>
	`${relative(cwd, file)} imports ${specifier}, which a standalone build resolves to arktype/runtime, where defining a Type throws, as it can't precompile what isn't a JavaScript or TypeScript module. Define the Types it uses in a module that is.`
