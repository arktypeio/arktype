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
 * Measured at 5628c3752 on Node 24.14.1, against moltar's
 * typescript-runtime-type-benchmarks at 499f3fb and schema-benchmarks at
 * f1e6e8e, by instruction counts and paired wall-clock runs.
 * Each claim is scoped as claims-final.md scopes it: precompiled or dynamic,
 * valid or invalid data, with or without errors. The headline holds for
 * precompiled ArkType benchmark by benchmark, from different builds: the
 * smallest builds optimize for size and are slower, so no claim says one build
 * is both.
 */

// moltar's typescript-runtime-type-benchmarks, perf instruction counts in
// benny's call shape, backed by paired wall clock (0.95x @ts-runtypes, faster
// in 46 of 64 passes pooled over every run, p 0.0006; typia, the weakest pair,
// 30 of 44, p 0.023). A 10% lead is 3-10% of wall time: say "fastest", never "x
// times faster". The strict cases lead only with countsKeys.
export const speedChart: BenchmarkChart = {
	title: "Runtime",
	detail:
		"moltar's parseSafe benchmark (validate, removing undeclared keys), run by us on Node 24: instructions per call. Precompiled ArkType isn't in moltar's published results yet.",
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
// reporting every error with its message. Precompiled with the lean errors set;
// keeping its errors' methods (default+lean) is 1262, still under Valibot.
export const sizeChart: BenchmarkChart = {
	title: "Bundle size",
	detail:
		"the login form as valibot.dev writes it, with its messages, bundled by us with bundlejs's esbuild settings; each reports every error. ArkType is precompiled for size: optimize \"size\", with its validators' members and methods and its errors' methods off",
	unit: "B gzipped",
	source: {
		label: "the form from valibot.dev's comparison",
		href: "https://valibot.dev/guides/comparison/"
	},
	axisMax: 26_000,
	bars: [
		{ name: "ArkType (precompiled)", kind: "precompiled", value: 1028 },
		{ name: "Valibot", kind: "other", value: 1547 },
		{ name: "Zod Mini", kind: "other", value: 5127 },
		{ name: "Zod", kind: "other", value: 25058 },
		{ name: "ArkType (dynamic)", kind: "dynamic", value: 75602 }
	]
}

/** sentences, each rendered by `<Claim id="..." />` */
export const claims = {
	// precompiled ArkType: moltar's parseSafe, 189 instructions vs Typia 213,
	// wall clock 30 of 44 passes against Typia (p 0.023); valibot.dev's login
	// form as written, 1028 vs Valibot 1547 B gz
	headline: "Faster than Typia. Smaller than Valibot.",
	headlineDetail:
		"Precompiled from the same definitions: fastest on moltar's parseSafe benchmark, and every error with its message on valibot.dev's login form in 1.03 kB.",
	headlineNote:
		"*Speed: moltar's parseSafe benchmark on valid data, run by us on Node 24: 189 instructions per call, Typia 213. ajv is faster on some invalid-data rows. Size: valibot.dev's login form as written, with its messages, bundled with bundlejs's esbuild settings and precompiled for size: 1.03 kB gzipped, Valibot 1.55 kB.",
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
		"In our runs of moltar's benchmark, precompiled ArkType is the fastest on parseSafe and assertLoose. Precompiled for size, it reports every error on Valibot's own login form, with its message, in a smaller bundle than Valibot.",
	// the product schema, valid data: 6003 vs 6002 instructions, wall a tie
	// (1.11, 3 of 12, p 0.15)
	dynamicSpeed:
		"In our runs of schemabenchmarks.dev's product schema, dynamic ArkType validates valid data as fast as precompiled ArkType.",
	// lean errors 1028 vs 1547 B gz, the form as written; default+lean 1.26 kB
	loginSize:
		"On Valibot's own login form, ArkType precompiled for size reports every error, with its message, in a smaller bundle than Valibot: 1.03 kB gzipped against 1.55 kB.",
	// moltar strict, dynamic, 2.2.3 to now: assertStrict 4067 -> 348,
	// parseStrict 3798 -> 392 instructions
	strictSpeedup:
		"Dynamic ArkType validates moltar's strict cases about 10 times faster than 2.2.",
	// 18 instructions, the harness floor; typia createIs 221
	noInit:
		"A precompiled Type costs nothing to create: it was built when you built."
} satisfies Record<string, Claim<string>>

export type ClaimId = keyof typeof claims
