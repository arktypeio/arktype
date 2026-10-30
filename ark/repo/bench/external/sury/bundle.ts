// bundles cases.ts into out/cases.mjs against Sury's benchmark installs
// (zod 4.4.3, valibot 1.4.2, @sinclair/typebox 0.34.52, arktype 2.2.3 and sury
// from the clone's working tree, as its bundle.ts aliases it), and arktype.ts
// into out/arktype.mjs, precompiled as a production build with the default
// options. child.ts runs either
// SURY=<sury clone, packages built> node sury/bundle.ts
import { precompile } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const sury = process.env.SURY ?? "../sury"
const here = import.meta.dirname
const bench = join(sury, "packages/benchmarks")

// resolved from the suite's package, so its pinned versions are bundled
await build({
	stdin: {
		contents: readFileSync(join(here, "cases.ts"), "utf8"),
		loader: "ts",
		resolveDir: bench
	},
	outfile: join(here, "out", "cases.mjs"),
	bundle: true,
	format: "esm",
	platform: "node",
	alias: { sury: join(sury, "packages/sury/index.mjs") },
	logLevel: "error"
})

await build({
	entryPoints: [join(here, "arktype.ts")],
	outfile: join(here, "out", "arktype.mjs"),
	bundle: true,
	format: "esm",
	platform: "node",
	conditions: ["production"],
	logLevel: "error",
	plugins: [precompile.esbuild({ cwd: here })]
})
