import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"

export interface Bundled {
	entry: string
	cwd: string
	precompiled?: PrecompileUnpluginOptions | undefined
	alias?: Record<string, string>
	minify: boolean
	webpack?: boolean | undefined
}

// the same bundle through webpack, which minifies with terser
const bundleWebpack = async ({
	entry,
	cwd,
	precompiled,
	alias,
	minify
}: Bundled): Promise<string> => {
	const webpack = createRequire(
		join(import.meta.dirname, "..", "..", "..", "aot", "package.json")
	)("webpack")
	const outDir = mkdtempSync(join(tmpdir(), "bigapp-webpack-"))
	const compiler = webpack({
		mode: "production",
		context: cwd,
		entry,
		target: "node",
		cache: false,
		devtool: false,
		experiments: { outputModule: true },
		output: {
			path: outDir,
			filename: "main.js",
			library: { type: "module" },
			module: true
		},
		optimization: {
			minimize: minify,
			// what an app gets: webpack only keeps annotations in an ESM library, for a
			// consumer to bundle again, which this is only so the bench can call it
			minimizeOptions: { javascript: { compress: { passes: 2 } } }
		},
		performance: false,
		resolve: {
			alias: alias ?? {},
			extensionAlias: {},
			conditionNames: ["production", "node", "import", "module", "default"]
		},
		module: {
			rules: [
				{
					test: /\.ts$/,
					enforce: "post",
					loader: join(import.meta.dirname, "stripTypes.ts")
				}
			]
		},
		plugins: precompiled ? [precompile.webpack({ cwd, ...precompiled })] : []
	})
	const stats: any = await new Promise((resolve, reject) =>
		compiler.run((error: unknown, stats: unknown) =>
			compiler.close(() => (error ? reject(error) : resolve(stats)))
		)
	)
	if (stats.hasErrors()) throw new Error(stats.toString("errors-only"))
	const code = readFileSync(join(outDir, "main.js"), "utf8")
	rmSync(outDir, { recursive: true, force: true })
	return code
}

// as a server bundles an app
export const bundle = async (bundled: Bundled): Promise<string> => {
	const { entry, cwd, precompiled, alias, minify } = bundled
	// the plugin's cache of answers, which are what this measures
	const cache = join(cwd, "node_modules", ".cache")
	rmSync(cache, { recursive: true, force: true })
	if (bundled.webpack) {
		const code = await bundleWebpack(bundled)
		rmSync(cache, { recursive: true, force: true })
		return code
	}
	const { outputFiles } = await build({
		entryPoints: [entry],
		bundle: true,
		minify,
		platform: "node",
		format: "esm",
		target: "node22.13",
		banner: {
			js: 'import { createRequire as __ntwineCreateRequire } from "node:module"; const require = __ntwineCreateRequire(import.meta.url);'
		},
		absWorkingDir: cwd,
		write: false,
		logLevel: "error",
		conditions: ["production"],
		alias: alias ?? {},
		plugins: precompiled ? [precompile.esbuild({ cwd, ...precompiled })] : []
	})
	rmSync(cache, { recursive: true, force: true })
	return outputFiles[0].text
}
