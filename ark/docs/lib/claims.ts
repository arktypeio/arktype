/**
 * Every benchmark number or superlative the site states outside the
 * homepage's own benchmark (lib/bench), in one place so each can be checked
 * against the benchmark that backs it.
 *
 * A `pending` value is draft copy that isn't backed yet. It renders marked as
 * pending, so nothing unverified reads as a claim.
 */

export type Pending<t> = { pending: t }

export type Claim<t> = t | Pending<t>

export const isPending = <t>(claim: Claim<t>): claim is Pending<t> =>
	typeof claim === "object" && claim !== null && "pending" in claim

export const draftOf = <t>(claim: Claim<t>): t =>
	isPending(claim) ? claim.pending : claim

export type BarKind = "precompiled" | "dynamic" | "other"

export interface BenchmarkBar {
	name: string
	kind: BarKind
	/** null until the benchmark backing it is verified */
	value: number | null
}

export interface BenchmarkChart {
	title: string
	/** the benchmark, its options and its environment */
	detail: Claim<string>
	unit: string
	source: {
		label: string
		href: string
	}
	/** where the axis ends, if a bar runs past it */
	axisMax?: number
	bars: BenchmarkBar[]
}

/**
 * Measured at c42ee008c, the release candidate, on Node 24.14.1, by the plan
 * and harness in ark/repo/bench/external, against moltar's
 * typescript-runtime-type-benchmarks at 499f3fb and schema-benchmarks at
 * f1e6e8e. Its results/ holds the instruction counts (counts.md), the sizes
 * (login.json) and the one pre-registered wall-clock run (wall.md: 30 paired
 * passes, Holm over H1-H4). H2, H3 and H4 held; H1 failed, so parseSafe copy
 * states instructions, not speed. Each claim is scoped: precompiled or
 * dynamic, valid or invalid data, with or without errors. Speed comes from the
 * default build and size from the "smallest" preset, so no claim says one
 * build is both.
 */

// moltar's typescript-runtime-type-benchmarks, perf instruction counts in
// benny's call shape, the default build. By wall clock (H1), it beat
// @ts-runtypes, Typia, ata-validator (AOT) and ata in 26-28 of 30 passes, but
// rescript-schema and @sx3/gate, at 234 and 233 instructions, were faster in
// 21 and 24 (0.96x and 0.95x its time), so the chart claims instructions only.
export const speedChart: BenchmarkChart = {
	title: "Runtime",
	detail:
		"moltar's parseSafe benchmark (validate, removing undeclared keys), run by us on Node 24: instructions per call, ArkType precompiled with the default options. Precompiled ArkType isn't in moltar's published results yet.",
	unit: "instructions per call",
	source: {
		label: "moltar/typescript-runtime-type-benchmarks",
		href: "https://github.com/moltar/typescript-runtime-type-benchmarks"
	},
	bars: [
		{ name: "ArkType (precompiled)", kind: "precompiled", value: 189 },
		{ name: "@ts-runtypes", kind: "other", value: 209 },
		{ name: "Typia", kind: "other", value: 213 },
		{ name: "ata-validator (AOT)", kind: "other", value: 220 },
		{ name: "ArkType (dynamic)", kind: "dynamic", value: 262 }
	]
}

// bundlejs-style esbuild of valibot.dev's login form as written, every entry
// reporting every error with its message. Precompiled with
// { preset: "smallest" } in a production build (esbuild's "production"
// condition): 2671 / 1312 B min / gz; 2943 / 1461 in development, and the
// default build 1740 in production.
export const sizeChart: BenchmarkChart = {
	title: "Bundle size",
	detail:
		'the login form as valibot.dev writes it, with its messages, bundled by us with bundlejs\'s esbuild settings; each reports every error. ArkType is precompiled with the "smallest" preset in a production build',
	unit: "B gzipped",
	source: {
		label: "the form from valibot.dev's comparison",
		href: "https://valibot.dev/guides/comparison/"
	},
	axisMax: 26_000,
	bars: [
		{ name: "ArkType (precompiled)", kind: "precompiled", value: 1312 },
		{ name: "Valibot", kind: "other", value: 1547 },
		{ name: "Zod Mini", kind: "other", value: 5127 },
		{ name: "Zod", kind: "other", value: 25058 },
		{ name: "ArkType (dynamic)", kind: "dynamic", value: 79915 }
	]
}

/** sentences, each rendered by `<Claim id="..." />` */
export const claims = {
	// precompiled ArkType: moltar's parseSafe, 189 instructions vs Typia 213.
	// By wall clock it beat Typia in 28 of 30 passes (0.95x), but that pair
	// isn't a test of its own: H1, faster than every close rival, failed, so
	// "Faster" awaits the author's decision. valibot.dev's login form as
	// written, 1312 vs Valibot 1547 B gz
	headline: "Faster than Typia. Smaller than Valibot.",
	headlineDetail:
		"Precompiled from the same definitions: the fewest instructions per call on moltar's parseSafe benchmark in our runs, and every error with its message on valibot.dev's login form in 1.31 kB.",
	headlineNote:
		"*Speed: moltar's parseSafe benchmark on valid data, run by us on Node 24 with the default build: 189 instructions per call, Typia 213. By wall clock it beat Typia in 28 of 30 paired runs, but rescript-schema and @sx3/gate, which take more instructions, were faster. ajv is faster on some invalid-data rows. Size: valibot.dev's login form as written, with its messages, bundled with bundlejs's esbuild settings and precompiled for size with the \"smallest\" preset in a production build: 1.31 kB gzipped, Valibot 1.55 kB.",
	// the fastest and the smallest builds differ: optimize "size" makes the
	// product schema's valid data 2.2x slower
	buildChoice:
		"Build the fastest validator or the smallest from the same definitions.",
	// the homepage's spec rows, each a fragment of a claim below
	dynamicSpec:
		"as fast as precompiled on valid data in our runs of schemabenchmarks.dev's benchmark",
	sizeSpec:
		"precompiled for size, smaller than Valibot on its own login form, with every error message",
	// the sentence under the docs' charts
	chartsSummary:
		"In our runs of moltar's benchmark, precompiled ArkType is the fastest on assertLoose and takes the fewest instructions per call on parseSafe. Precompiled for size, it reports every error on Valibot's own login form, with its message, in a smaller bundle than Valibot.",
	// the product schema, valid data: 6004 vs 6003 instructions; by wall clock
	// (H3), dynamic took 0.998x the default build's time and stayed under 1.05x
	// in 22 of 30 passes (p 0.0081)
	dynamicSpeed:
		"In our runs of schemabenchmarks.dev's product schema, dynamic ArkType validates valid data as fast as precompiled ArkType.",
	// "smallest" in production, 1312 vs 1547 B gz, the form as written
	loginSize:
		"On Valibot's own login form, ArkType precompiled for size reports every error, with its message, in a smaller bundle than Valibot: 1.31 kB gzipped against 1.55 kB.",
	// moltar strict, dynamic, 2.2.9 to now: assertStrict 3948 -> 348,
	// parseStrict 4927 -> 392 instructions (2.2.9's counts vary by 14-16%, its
	// ratios 11.2x to 13x); by wall clock (H4), 0.078x 2.2.9's time on
	// assertStrict, under 0.2x in 30 of 30 passes
	strictSpeedup:
		"Dynamic ArkType validates moltar's strict cases about 10 times faster than 2.2.",
	// 18 instructions, the harness floor; typia createIs 221
	noInit:
		"A precompiled Type costs nothing to create: it was built when you built.",
	// `import { type } from "arktype"` by ark/repo/bench/bundle.ts's method
	// (esbuild bundle + minify, esm, neutral, gzip): 79943 vs 2.2.9's 47803 B
	// gz (253923 vs 156113 min); sizeChart's dynamic bar, the login form, is
	// 79915
	dynamicSize:
		"Dynamic ArkType is 79.9 kB gzipped, minified with esbuild, up from 47.8 kB in 2.2.9, so precompile to ship less."
} satisfies Record<string, Claim<string>>

export type ClaimId = keyof typeof claims
