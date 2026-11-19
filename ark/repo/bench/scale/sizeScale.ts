// The measurements behind the docs' "Bundle size at scale"
// (ark/docs/content/docs/precompile/size-at-scale.mdx): the whole bundle of a
// synthetic app as its schemas grow from 1 to 5,000, in raw minified, gzip and
// brotli bytes, for ArkType precompiled with the default options and with
// preset: "smallest", ArkType creating its Types at runtime, Valibot, Zod and
// Zod Mini.
//
// What's bundled is an app, not a package of schemas (synth.ts's modulesOf):
// its one export takes a schema's name and some input and runs that schema's
// handler, which validates the input and returns the data or the text of
// what's wrong with it. That's what a route or a form's submit does with a
// schema, in each library's own words: ArkType's call and its errors' summary,
// Valibot's safeParse and summarize, Zod's and Zod Mini's safeParse and
// prettifyError. Nothing outside the bundle can read a schema, so each
// library ships what those need and no more: a precompiled build drops the
// members of a validator no handler reads, and Valibot the functions no
// handler calls. An entry that exports its schemas instead asks a precompiled
// build to keep every member of every one, as whoever imports it might read
// them, which no other library here pays for. BENCH_ENTRY=exports sizes that:
// at 5d73f2ba0, about 100 B of gzip more for "smallest" against Valibot at
// every count.
//
// The schemas are in modules of 25. 26% of the modules, spread evenly from
// where the seed starts them, hold their schemas' handlers, and the rest have
// theirs in a module of handlers that imports the schemas. That's the layout
// of the production app the "forms" rates are from, counted with TypeScript's
// parser: code in the module declaring a Type uses 55 of the 210 its web app
// declares (a form's component declaring its schema, where the rest are
// modules of schemas other modules import), and 42 of the 46 files with such a
// Type use every Type they declare that way, so it's a module that's
// colocated and not a schema. Where a handler is matters to a precompiled
// build, which can declare a Type its own module doesn't use more briefly, so
// each row also has both ends, every handler apart and every handler with its
// schema, for the builds in layoutBuilds.
//
// Each corpus is synth.ts's app at three seeds. "models" is measure.ts's
// mixed app, schemas with no message or function of their own, as an API's
// are. "forms" gives 35% of its fields a message and narrows 25% of its
// unformatted strings and integers, which is about 1.8 messages and 0.5
// narrows a schema, the rates of the production app this was first measured
// on. "messages" and "narrows" have one of the two each, to say what each costs.
//
// Before sizing anything, agree.ts creates each corpus's largest app in every
// library, ArkType dynamically, and checks that its one export accepts and
// rejects the same values for each schema, with the text of each failure. A
// smaller app of a seed is the first schemas of its largest, so that covers
// every schema sized.
//
// Writes ark/docs/lib/bench/sizeScale.json, whose fits and crossovers
// ark/docs/lib/bench/sizeScale.ts derives, so the page follows a new run.
//
// Run `pnpm build` first to bundle arktype's build. The script runs with a
// 16 GiB heap, which the build's pruning needs at 5,000 schemas (build.ts), and
// takes about half an hour, most of it the default build's largest apps.
//
// usage: pnpm benchSizeScale
//        BENCH_SCALES=1,50 BENCH_SEEDS=1 pnpm benchSizeScale (a part of it, written to ark/repo/bench/out/sizeScale-app.json)
//        BENCH_ENTRY=exports pnpm benchSizeScale (every schema exported and none run, written to ark/repo/bench/out/sizeScale-exports.json)
import { execFileSync, execSync } from "node:child_process"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { brotliCompressSync, gzipSync } from "node:zlib"
import { format, resolveConfig } from "prettier"
import {
	bundleOf,
	scaleBuilds,
	type ScaleBuild,
	type ScaleEntry
} from "./build.ts"
import {
	modulesOf,
	synthLibraries,
	synthOf,
	type SynthOptions
} from "./synth.ts"

// "exports" isn't the docs' data: it says what an app's bundle leaves out
const entry: ScaleEntry =
	process.env.BENCH_ENTRY === "exports" ? "exports" : "app"

const partial = !!(
	process.env.BENCH_SCALES ||
	process.env.BENCH_SEEDS ||
	entry === "exports"
)

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

/** an app's sizes at each end of where its handlers can be, for the builds sized at both */
type Ends = Record<LayoutId, Record<LayoutBuild, Size>>

interface Row {
	schemas: number
	messages: number
	narrows: number
	/** at the share of modules colocated that an app has */
	sizes: Record<ScaleBuild, Size>
	/** at each end of it. An entry that exports its schemas has no handlers to lay out. */
	layouts?: Ends
}

// an app is modules of this many schemas, as no app writes thousands in one
const perModule = 25

// Counted in the production app the "forms" rates are from: of the Types its
// web app declares, those that code in the module declaring them uses, and of
// the files with one of those, the files where that's every Type they declare
const colocation = { types: 55, ofTypes: 210, wholeFiles: 42, files: 46 }

// the share of modules that hold their schemas' handlers
const colocated = colocation.types / colocation.ofTypes

/** every handler in a module apart from its schema's, and every handler in its schema's */
const layouts = { split: 0, colocated: 1 }

type LayoutId = keyof typeof layouts

// What the two ends are sized for: "smallest", which they move, and the
// library it's closest to, which they don't. The default build doesn't move
// either, by more than 0.3% of any bundle to 1,000 schemas at 5d73f2ba0, and
// building it at both ends would more than double the run.
const layoutBuilds = ["smallest", "valibot"] as const satisfies ScaleBuild[]

type LayoutBuild = (typeof layoutBuilds)[number]

const sizeOf = (js: string): Size => ({
	raw: Buffer.byteLength(js),
	gzip: gzipSync(js).length,
	brotli: brotliCompressSync(js).length
})

// each entry's apps in a directory of their own, so one of each can run at once
const out = join(import.meta.dirname, "..", "out", `sizeScale-${entry}`)

// writes an app's modules for each library and returns what synthOf counted
const writeApp = (
	dir: string,
	{ options }: Corpus,
	seed: number,
	schemas: number,
	share: number
) => {
	rmSync(dir, { recursive: true, force: true })
	const app = synthOf(schemas, seed, options)
	for (const library of synthLibraries) {
		const modules = modulesOf(library, app[library], {
			perModule,
			colocated: share,
			seed
		})
		for (const [path, source] of Object.entries(modules)) {
			mkdirSync(dirname(join(dir, path)), { recursive: true })
			writeFileSync(join(dir, path), source)
		}
	}
	return app
}

// Each seed's largest app is created in every library and is one app in each
// before any of it is sized, in a process of its own, as thousands of schemas
// in four libraries are more than this one should keep. A definition a library
// throws on stops the run here.
for (const corpus of corpora) {
	for (const seed of seeds) {
		const largest = Math.max(...scales)
		const dir = join(out, `agree-${corpus.id}-${seed}`)
		const app = writeApp(dir, corpus, seed, largest, colocated)
		for (const schemas of scales) {
			if (
				!app.arktype.startsWith(synthOf(schemas, seed, corpus.options).arktype)
			) {
				throw new Error(
					`${corpus.id} seed ${seed} at ${schemas} isn't the first schemas of its app of ${largest}, so checking that one doesn't check it`
				)
			}
		}
		const agreement = execFileSync(
			process.execPath,
			[join(import.meta.dirname, "agree.ts"), dir],
			{ encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }
		)
		console.log(
			corpus.id,
			seed,
			"is one app in each library:",
			agreement.trim()
		)
		rmSync(dir, { recursive: true, force: true })
	}
}

const rowOf = async (
	corpus: Corpus,
	seed: number,
	schemas: number
): Promise<Row> => {
	const dir = join(out, `${corpus.id}-${seed}-${schemas}`)
	const sizesOf = async <build extends ScaleBuild>(
		builds: readonly build[]
	): Promise<Record<build, Size>> => {
		const sizes: Partial<Record<build, Size>> = {}
		for (const build of builds)
			sizes[build] = sizeOf(await bundleOf(dir, build, entry))
		return sizes as never
	}
	// the schemas alone are the modules of an app with no handler among them
	const { messages, narrows } = writeApp(
		dir,
		corpus,
		seed,
		schemas,
		entry === "app" ? colocated : 0
	)
	const row: Row = {
		schemas,
		messages,
		narrows,
		sizes: await sizesOf(scaleBuilds)
	}
	if (entry === "app") {
		const ends: Partial<Ends> = {}
		for (const [id, share] of Object.entries(layouts)) {
			writeApp(dir, corpus, seed, schemas, share)
			ends[id as LayoutId] = await sizesOf(layoutBuilds)
		}
		row.layouts = ends as Ends
	}
	rmSync(dir, { recursive: true, force: true })
	return row
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
			if (row.layouts) {
				console.log(
					"  smallest with every handler apart, and with its schema:",
					`${row.layouts.split.smallest.raw}/${row.layouts.split.smallest.gzip}`,
					`${row.layouts.colocated.smallest.raw}/${row.layouts.colocated.smallest.gzip}`
				)
			}
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
		join(bench, "out", `sizeScale-${entry}.json`)
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
			colocated,
			colocation,
			builds: scaleBuilds,
			layoutBuilds,
			corpora: results
		}),
		{ ...(await resolveConfig(written)), filepath: written }
	)
)
