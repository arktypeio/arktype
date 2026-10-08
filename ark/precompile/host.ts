import { existsSync, readFileSync } from "node:fs"
import { ResolverFactory } from "oxc-resolver"

export interface PrecompileHost {
	resolve(specifier: string, importer: string): string | undefined
	readFile(path: string): string | undefined
}

export interface NodeHostOptions {
	// export conditions to resolve with, in priority order
	conditions?: string[]
	// a tsconfig whose `paths` the resolver follows, found from each importer when omitted
	tsconfig?: string
}

export const createNodeHost = (opts?: NodeHostOptions): PrecompileHost => {
	const resolver = new ResolverFactory({
		tsconfig:
			opts?.tsconfig ?
				{ configFile: opts.tsconfig, references: "auto" }
			:	"auto",
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
	})
	return {
		resolve: (specifier, importer) =>
			resolver.resolveFileSync(importer, specifier).path,
		readFile: path =>
			existsSync(path) ? readFileSync(path, "utf8") : undefined
	}
}
