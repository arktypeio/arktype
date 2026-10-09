import { precompile } from "@ark/precompile/unplugin"
import { build, type Metafile } from "esbuild"
import { join } from "node:path"

export const scenarios = ["login", "moltar", "shop"] as const

export type Scenario = (typeof scenarios)[number]

export const libraries = ["valibot", "zod", "arktype", "standalone"] as const

export type Library = (typeof libraries)[number]

const apps = join(import.meta.dirname, "apps")

export interface Bundle {
	js: string
	metafile: Metafile
}

// a scenario's exports, plus valibot's safeParse since its schemas have no methods
export const bundle = async (
	scenario: Scenario,
	library: Library
): Promise<Bundle> => {
	const { outputFiles, metafile } = await build({
		stdin: {
			contents:
				library === "standalone" ? `export * from "./${scenario}/arktype.ts"`
				: library === "valibot" ?
					`export * from "./${scenario}/valibot.ts"\nexport { safeParse } from "valibot"`
				:	`export * from "./${scenario}/${library}.ts"`,
			resolveDir: apps,
			loader: "ts"
		},
		bundle: true,
		minify: true,
		format: "esm",
		platform: "neutral",
		write: false,
		metafile: true,
		logLevel: "error",
		plugins: library === "standalone" ? [precompile.esbuild({ cwd: apps })] : []
	})
	return { js: outputFiles[0].text, metafile }
}
