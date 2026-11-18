// The measurements behind the "smallest" preset's size claims and table
// (ark/docs/lib/claims.ts): the homepage's login and shop apps, then
// synthetic apps of 10 to 1000 Types written alike in ArkType and Valibot,
// each bundled as bundle.ts bundles the homepage apps (esbuild, minified,
// production) and gzipped. ArkType is precompiled with the default options
// and with preset: "smallest", and Valibot's bundle adds the functions its
// schemas need to do what a validator does. Each series is three seeds of the
// mixed app, then an app of arrays of references, whose Types form a graph.
// Writes ark/docs/lib/bench/presetScale.json.
//
// Run `pnpm build` first to bundle arktype's build.
//
// usage: pnpm benchScale
import { precompile } from "@ark/aot/unplugin"
import { build } from "esbuild"
import { execSync } from "node:child_process"
import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync
} from "node:fs"
import { join } from "node:path"
import { gzipSync } from "node:zlib"
import { bundle, usageEntries } from "../bundle.ts"
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

type Build = "default" | "smallest" | "valibot"

const homepageApps = ["login", "shop"] as const

const homepageLibraries = {
	default: "standalone",
	smallest: "standaloneSmallest",
	valibot: "valibot"
} as const

const definition = /^(?:export )?const \w+ =/gm

// the Types an app defines, in arktype.ts and the modules beside it
const typesOf = (app: string) => {
	const dir = join(import.meta.dirname, "..", "apps", app)
	const modules = join(dir, "arktype")
	const paths = [
		join(dir, "arktype.ts"),
		...(existsSync(modules) ?
			readdirSync(modules).map(name => join(modules, name))
		:	[])
	]
	return paths.reduce(
		(sum, path) =>
			sum + [...readFileSync(path, "utf8").matchAll(definition)].length,
		0
	)
}

const homepageGzipOf = async (
	app: (typeof homepageApps)[number],
	build: Build
) => gzipSync((await bundle(app, homepageLibraries[build])).js).length

const appResults = []
for (const app of homepageApps) {
	const row = {
		app,
		types: typesOf(app),
		default: await homepageGzipOf(app, "default"),
		smallest: await homepageGzipOf(app, "smallest"),
		valibot: await homepageGzipOf(app, "valibot")
	}
	console.log(row)
	appResults.push(row)
}

const gzipOf = async (dir: string, library: Build) => {
	const { outputFiles } = await build({
		stdin: {
			contents:
				library === "valibot" ?
					`export * from "./valibot.ts"\n${usageEntries.valibot}`
				:	`export * from "./arktype.ts"`,
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
			library === "default" ? [precompile.esbuild({ cwd: dir })]
			: library === "smallest" ?
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
			default: await gzipOf(dir, "default"),
			smallest: await gzipOf(dir, "smallest"),
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
	JSON.stringify({ commit, apps: appResults, series: results }, null, "\t") +
		"\n"
)
