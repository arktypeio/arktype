import { existsSync, readFileSync } from "node:fs"
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
		readFile: path =>
			existsSync(path) ? readFileSync(path, "utf8") : undefined
	}
}

export const transformedFilter = {
	include: /\.(?:[cm]?[jt]s|[jt]sx)$/,
	exclude: /\/node_modules\//
}
