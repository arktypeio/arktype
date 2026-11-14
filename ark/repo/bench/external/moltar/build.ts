// precompiles types.ts into out/<build>.cjs for cjs/cases.ts, as a production
// esbuild build: b1 is the default build, b2 the "smallest" preset
// node moltar/build.ts
import { precompile } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { join } from "node:path"

const dir = import.meta.dirname

export const builds = {
	b1: {},
	b2: { preset: "smallest" }
} as const

for (const [name, options] of Object.entries(builds)) {
	await build({
		entryPoints: [join(dir, "types.ts")],
		outfile: join(dir, "out", `${name}.cjs`),
		bundle: true,
		minify: true,
		format: "cjs",
		platform: "node",
		conditions: ["production"],
		logLevel: "warning",
		plugins: [precompile.esbuild({ cwd: dir, ...options })]
	})
}
