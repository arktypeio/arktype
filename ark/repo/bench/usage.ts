// run `pnpm build` first to bundle arktype's build

import { precompile, type PrecompileUnpluginOptions } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { join } from "node:path"
import { gzipSync } from "node:zlib"
import { sizedScenarios } from "./bundle.ts"

// Each app as a request handler uses it: its consumer module calls each
// validator on a body and returns the data or the issues. A production build
// leaves out of each validator what no handler reads, which `prune: false`
// keeps, so every arktype row carries the usage Valibot's safeParse
// handlers do.
const libraries = {
	standalone: {},
	"standalone, prune: false": { prune: false },
	standaloneSmallest: { preset: "smallest" },
	"standaloneSmallest, prune: false": { preset: "smallest", prune: false },
	valibot: undefined
} satisfies Record<string, PrecompileUnpluginOptions | undefined>

const apps = join(import.meta.dirname, "apps")

const sizes: Record<string, Record<string, number>> = {}

for (const scenario of sizedScenarios) {
	for (const [library, opts] of Object.entries(libraries)) {
		const { outputFiles } = await build({
			entryPoints: [
				join(apps, scenario, "consumer", `${opts ? "arktype" : library}.ts`)
			],
			bundle: true,
			minify: true,
			format: "esm",
			platform: "neutral",
			write: false,
			logLevel: "error",
			conditions: opts ? ["production"] : [],
			plugins: opts ? [precompile.esbuild({ cwd: apps, ...opts })] : []
		})
		const js = outputFiles[0].text
		sizes[`${scenario} (${library})`] = {
			"min (B)": js.length,
			"gzip (B)": gzipSync(js).length
		}
	}
}

console.table(sizes)
