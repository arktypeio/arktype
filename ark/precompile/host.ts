import { existsSync, readFileSync, realpathSync } from "node:fs"
import { dirname, join } from "node:path"
import type { SourceMap } from "magic-string"
import { ResolverFactory, type NapiResolveOptions } from "oxc-resolver"

export interface PrecompileHost {
	resolve(specifier: string, importer: string): string | undefined
	readFile(path: string): string | undefined
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
	return {
		resolve: (specifier, importer) => {
			const result = resolver.resolveFileSync(importer, specifier)
			if (!result.error || !/tsconfig/i.test(result.error)) return result.path
			// a tsconfig the resolver cannot load, like one extending a file a tool generates, fails every resolution
			resolverWithoutTsconfig ??= resolver.cloneWithOptions(resolveOptions)
			return resolverWithoutTsconfig.resolveFileSync(importer, specifier).path
		},
		readFile
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
	const match = /.*\/node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(file)
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

export const runtimeSpecifiers = ["arktype", "arktype/config"]

export const transformedExtension = /\.(?:[cm]?[jt]s|[jt]sx)$/

export const transformedFilterOf = (
	packages: string[]
): { include: RegExp; exclude: RegExp } => ({
	include: transformedExtension,
	// a module in node_modules, unless the package it's in, after the last node_modules, opts in
	exclude:
		packages.length ?
			new RegExp(
				`/node_modules/(?!(?:${packages.map(name => name.replace(/\./g, "\\.")).join("|")})/)(?!.*/node_modules/)`
			)
		:	/\/node_modules\//
})
