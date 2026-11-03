import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { rmSync } from "node:fs"
import { join } from "node:path"

export interface Bundled {
	entry: string
	cwd: string
	precompiled?: PrecompileUnpluginOptions | undefined
	alias?: Record<string, string>
	minify: boolean
}

// as a server bundles an app
export const bundle = async ({
	entry,
	cwd,
	precompiled,
	alias,
	minify
}: Bundled): Promise<string> => {
	// the plugin's cache of answers, which are what this measures
	const cache = join(cwd, "node_modules", ".cache")
	rmSync(cache, { recursive: true, force: true })
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
