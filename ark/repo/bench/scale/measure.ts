// The measurements behind the "smallest" preset's size claims
// (ark/docs/lib/claims.ts): synthetic apps of 10 to 1000 Types, written alike
// in ArkType and Valibot, each bundled as bundle.ts bundles the homepage apps
// (esbuild, minified, production) and gzipped. ArkType is precompiled with
// preset: "smallest", and Valibot's bundle adds the functions its schemas
// need to do what a validator does. Each series is three seeds of the mixed
// app, then an app of arrays of references, whose Types form a graph.
// Writes ark/docs/lib/bench/presetScale.json.
//
// Run `pnpm build` first to bundle arktype's build.
//
// usage: pnpm benchScale
import { precompile } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { execSync } from "node:child_process"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { gzipSync } from "node:zlib"
import { usageEntries } from "../bundle.ts"
import { synthOf, type SynthOptions } from "./synth.ts"

const scales = [10, 50, 200, 1000]

const series: { apps: string; seed: number; options?: SynthOptions }[] = [
	{ apps: "mixed", seed: 1 },
	{ apps: "mixed", seed: 2 },
	{ apps: "mixed", seed: 3 },
	{
		apps: "references",
		seed: 1,
		options: {
			kinds: ["array"],
			required: true,
			nonNullable: true,
			noUnions: true
		}
	}
]

const out = join(import.meta.dirname, "..", "out", "scale")

const gzipOf = async (dir: string, library: "arktype" | "valibot") => {
	const { outputFiles } = await build({
		stdin: {
			contents:
				library === "arktype" ?
					`export * from "./arktype.ts"`
				:	`export * from "./valibot.ts"\n${usageEntries.valibot}`,
			resolveDir: dir,
			loader: "ts"
		},
		bundle: true,
		minify: true,
		format: "esm",
		platform: "neutral",
		write: false,
		logLevel: "error",
		conditions: ["production"],
		plugins:
			library === "arktype" ?
				[precompile.esbuild({ cwd: dir, preset: "smallest" })]
			:	[]
	})
	return gzipSync(outputFiles[0].text).length
}

const results = []
for (const { apps, seed, options } of series) {
	const rows = []
	for (const types of scales) {
		const dir = join(out, `${apps}-${seed}-${types}`)
		rmSync(dir, { recursive: true, force: true })
		mkdirSync(dir, { recursive: true })
		const app = synthOf(types, seed, options)
		writeFileSync(join(dir, "arktype.ts"), app.arktype)
		writeFileSync(join(dir, "valibot.ts"), app.valibot)
		const row = {
			types,
			smallest: await gzipOf(dir, "arktype"),
			valibot: await gzipOf(dir, "valibot")
		}
		console.log(apps, seed, row)
		rows.push(row)
	}
	results.push({ apps, seed, rows })
}

const commit = execSync("git rev-parse --short=9 HEAD", {
	encoding: "utf8"
}).trim()

writeFileSync(
	join(
		import.meta.dirname,
		"..",
		"..",
		"..",
		"docs",
		"lib",
		"bench",
		"presetScale.json"
	),
	JSON.stringify({ commit, series: results }, null, "\t") + "\n"
)
