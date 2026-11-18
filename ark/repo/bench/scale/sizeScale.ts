// The measurements behind the docs' "Bundle size at scale"
// (ark/docs/content/docs/precompile/size-at-scale.mdx): the whole bundle of a
// synthetic app as its schemas grow from 1 to 5,000, in raw minified, gzip and
// brotli bytes, for ArkType precompiled with the default options and with
// preset: "smallest", ArkType creating its Types at runtime, Valibot, Zod and
// Zod Mini. Each is bundled as measure.ts bundles its apps (build.ts).
//
// Each corpus is synth.ts's app at three seeds, in modules of 25 schemas. "models" is measure.ts's
// mixed app, schemas with no message or function of their own, as an API's
// are. "forms" gives 35% of its fields a message and narrows 25% of its
// unformatted strings and integers, which is about 1.8 messages and 0.5
// narrows a schema, the rates of the production app this was first measured
// on. "messages" and "narrows" have one of the two each, to say what each costs.
//
// Before sizing anything, agree.ts checks that each corpus is the same app in
// every library: its schemas accept and reject the same values.
//
// Writes ark/docs/lib/bench/sizeScale.json, whose fits and crossovers
// ark/docs/lib/bench/sizeScale.ts derives, so the page follows a new run.
//
// Run `pnpm build` first to bundle arktype's build. The script runs with a
// 16 GiB heap, which the build's pruning needs at 5,000 schemas (build.ts), and
// takes about half an hour, most of it the default build's largest apps.
//
// usage: pnpm benchSizeScale
//        BENCH_SCALES=1,50 BENCH_SEEDS=1 pnpm benchSizeScale (a part of it, written to ark/repo/bench/out/sizeScale.json)
import { execSync } from "node:child_process"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { brotliCompressSync, gzipSync } from "node:zlib"
import { format, resolveConfig } from "prettier"
import { agreementOf } from "./agree.ts"
import { bundleOf, scaleBuilds, type ScaleBuild } from "./build.ts"
import {
	modulesOf,
	synthLibraries,
	synthOf,
	type SynthOptions
} from "./synth.ts"

const partial = !!(process.env.BENCH_SCALES || process.env.BENCH_SEEDS)

const numbersOf = (list: string | undefined, fallback: number[]) =>
	list ? list.split(",").map(Number) : fallback

const scales = numbersOf(
	process.env.BENCH_SCALES,
	[1, 10, 50, 100, 250, 500, 1000, 2500, 5000]
)

const seeds = numbersOf(process.env.BENCH_SEEDS, [1, 2, 3])

interface Corpus {
	id: string
	options: SynthOptions
}

const corpora: Corpus[] = [
	{ id: "models", options: {} },
	{ id: "messages", options: { messages: 0.35 } },
	{ id: "narrows", options: { narrows: 0.25 } },
	{ id: "forms", options: { messages: 0.35, narrows: 0.25 } }
]

interface Size {
	raw: number
	gzip: number
	brotli: number
}

interface Row {
	schemas: number
	messages: number
	narrows: number
	sizes: Record<ScaleBuild, Size>
}

// an app is modules of this many schemas, as no app writes thousands in one
const perModule = 25

const sizeOf = (js: string): Size => ({
	raw: Buffer.byteLength(js),
	gzip: gzipSync(js).length,
	brotli: brotliCompressSync(js).length
})

const out = join(import.meta.dirname, "..", "out", "sizeScale")

// writes an app's modules for each library and returns what synthOf counted
const writeApp = (
	dir: string,
	{ options }: Corpus,
	seed: number,
	schemas: number
) => {
	rmSync(dir, { recursive: true, force: true })
	const app = synthOf(schemas, seed, options)
	for (const library of synthLibraries) {
		const modules = modulesOf(library, app[library], perModule)
		for (const [path, source] of Object.entries(modules)) {
			mkdirSync(dirname(join(dir, path)), { recursive: true })
			writeFileSync(join(dir, path), source)
		}
	}
	return app
}

// each corpus is one app in every library before any of it is sized
for (const corpus of corpora) {
	const dir = join(out, `agree-${corpus.id}`)
	writeApp(dir, corpus, 1, 300)
	console.log(corpus.id, "agrees in each library on", await agreementOf(dir))
	rmSync(dir, { recursive: true, force: true })
}

const rowOf = async (
	corpus: Corpus,
	seed: number,
	schemas: number
): Promise<Row> => {
	const dir = join(out, `${corpus.id}-${seed}-${schemas}`)
	const { messages, narrows } = writeApp(dir, corpus, seed, schemas)
	const sizes: Partial<Record<ScaleBuild, Size>> = {}
	for (const build of scaleBuilds)
		sizes[build] = sizeOf(await bundleOf(dir, build))
	rmSync(dir, { recursive: true, force: true })
	return { schemas, messages, narrows, sizes: sizes as Row["sizes"] }
}

const results = []
for (const corpus of corpora) {
	const runs = []
	for (const seed of seeds) {
		const rows: Row[] = []
		for (const schemas of scales) {
			const row = await rowOf(corpus, seed, schemas)
			console.log(
				corpus.id,
				seed,
				schemas,
				scaleBuilds
					.map(
						build => `${build} ${row.sizes[build].raw}/${row.sizes[build].gzip}`
					)
					.join("  ")
			)
			rows.push(row)
		}
		runs.push({ seed, rows })
	}
	results.push({ ...corpus, runs })
}

rmSync(out, { recursive: true, force: true })

const bench = join(import.meta.dirname, "..")

const repo = join(bench, "..", "..", "..")

const versionOf = (packageJson: string): string =>
	JSON.parse(readFileSync(packageJson, "utf8")).version

// a package's own package.json, which its exports may not name
const installedVersionOf = (name: string) => {
	const entry = createRequire(join(bench, "bundle.ts")).resolve(name)
	return versionOf(
		join(
			entry.slice(0, entry.lastIndexOf(`node_modules/${name}/`)),
			"node_modules",
			name,
			"package.json"
		)
	)
}

const commit = execSync("git rev-parse --short=9 HEAD", {
	encoding: "utf8"
}).trim()

// a part of the measurement isn't the docs' data
const written =
	partial ?
		join(bench, "out", "sizeScale.json")
	:	join(repo, "ark", "docs", "lib", "bench", "sizeScale.json")

// formatted as the repo's prettier config formats it, so a rewrite passes lint
writeFileSync(
	written,
	await format(
		JSON.stringify({
			commit,
			versions: {
				arktype: versionOf(join(repo, "ark", "type", "package.json")),
				valibot: installedVersionOf("valibot"),
				zod: installedVersionOf("zod"),
				esbuild: installedVersionOf("esbuild")
			},
			scales,
			perModule,
			builds: scaleBuilds,
			corpora: results
		}),
		{ ...(await resolveConfig(written)), filepath: written }
	)
)
