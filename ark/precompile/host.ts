import { existsSync, readFileSync, realpathSync } from "node:fs"
import { dirname, isAbsolute, join } from "node:path"
import type { SourceMap } from "magic-string"
import { ResolverFactory, type NapiResolveOptions } from "oxc-resolver"
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
	// a tsconfig whose `paths` the resolver follows, found from each importer when omitted
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
			// a tsconfig the resolver cannot load, like one extending a file a tool generates, fails every resolution
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

// e.g. `"arktype": { "precompile": true }`, with which a package's modules are analyzed and transformed like the program's
export const optsIn = (manifest: string | undefined): boolean =>
	manifest !== undefined && JSON.parse(manifest).arktype?.precompile === true

// the package in node_modules a file belongs to, if any
export const dependencyOf = (
	file: string
): [root: string, name: string] | undefined => {
	// most files are outside node_modules, where the pattern retries its `.*` from each character
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
	// the project, then each package that opts in, whose dependencies may opt in too
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

export const runtimeSpecifiers = ["arktype", "arktype/config", "arktype/errors"]

// in shadow mode arktype creates each site beside its validator, so only its configuration resolves to the runtime
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

export const writeUndetailedImportMessage = <
	importer extends string,
	specifier extends string
>(
	importer: importer,
	specifier: specifier
): writeUndetailedImportMessage<importer, specifier> =>
	`${importer} imports ${specifier}, which a build with errors: "none" can't load beside its runtime, a copy of @ark/schema's whose errors are a class of their own`

export type writeUndetailedImportMessage<
	importer extends string,
	specifier extends string
> = `${importer} imports ${specifier}, which a build with errors: "none" can't load beside its runtime, a copy of @ark/schema's whose errors are a class of their own`

// a virtual module, like Rolldown's `\0rolldown/runtime.js`, names no file to read or resolve from
export const transformedId = /^[^\0].*\.(?:[cm]?[jt]s|[jt]sx)$/

export const transformedFilterOf = (
	packages: string[]
): { include: RegExp; exclude: RegExp } => ({
	include: transformedId,
	// a module in node_modules, unless the package it's in, after the last node_modules, opts in
	exclude:
		packages.length ?
			new RegExp(
				`/node_modules/(?!(?:${packages.map(name => name.replace(/\./g, "\\.")).join("|")})/)(?!.*/node_modules/)`
			)
		:	/\/node_modules\//
})

export const writeTextlessMessage = <path extends string>(
	path: path
): writeTextlessMessage<path> =>
	`${path} imports arktype but was loaded without @ark/precompile/node's hooks, before register() ran or by a loader that compiles it itself, as tsx does in a CommonJS package, so a standalone build can't precompile it`

export type writeTextlessMessage<path extends string> =
	`${path} imports arktype but was loaded without @ark/precompile/node's hooks, before register() ran or by a loader that compiles it itself, as tsx does in a CommonJS package, so a standalone build can't precompile it`
