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
 * Backed by claims-final.md (precompile 5628c3752, Node 24.14.1), whose
 * harnesses and raw results are in that thread's lane-claims2 directory.
 * Each claim is scoped as claims-final.md scopes it: precompiled or dynamic,
 * valid or invalid data, with or without errors. "Smallest, fastest" holds for
 * precompiled ArkType benchmark by benchmark, from different builds: the
 * smallest builds optimize for size and are slower, so no claim says one build
 * is both.
 */

// moltar's typescript-runtime-type-benchmarks, perf instruction counts in
// benny's call shape, backed by paired wall clock (0.95x @ts-runtypes, 17 of
// 20, p 0.0026). A 10% lead is 3-10% of wall time: say "fastest", never "x
// times faster". The strict cases lead only with countsKeys.
export const speedChart: BenchmarkChart = {
	title: "Runtime",
	detail:
		"moltar's parseSafe benchmark (validate, removing undeclared keys), instructions per call, Node 24",
	unit: "instructions per call",
	source: {
		label: "moltar/typescript-runtime-type-benchmarks",
		href: "https://moltar.github.io/typescript-runtime-type-benchmarks/"
	},
	bars: [
		{ name: "ArkType (precompiled)", kind: "precompiled", value: 189 },
		{ name: "@ts-runtypes", kind: "other", value: 209 },
		{ name: "Typia", kind: "other", value: 213 },
		{ name: "ata-validator (AOT)", kind: "other", value: 220 },
		{ name: "ArkType (dynamic)", kind: "dynamic", value: 262 }
	]
}

// bundlejs-style esbuild of valibot.dev's login form, every entry reporting
// every error with its message. Precompiled with the lean errors set; keeping
// its errors' methods (default+lean) is 1149, still under Valibot.
export const sizeChart: BenchmarkChart = {
	title: "Bundle size",
	detail:
		"valibot.dev's login form, each reporting every error with a message; precompiled with its validator's members and methods, and its errors' methods, off",
	unit: "B gzipped",
	source: {
		label: "valibot.dev's comparison",
		href: "https://valibot.dev/guides/comparison/"
	},
	axisMax: 26_000,
	bars: [
		{ name: "ArkType (precompiled)", kind: "precompiled", value: 912 },
		{ name: "Valibot", kind: "other", value: 1475 },
		{ name: "Zod Mini", kind: "other", value: 5127 },
		{ name: "Zod", kind: "other", value: 25058 },
		{ name: "ArkType (dynamic)", kind: "dynamic", value: 75520 }
	]
}

/** sentences, each rendered by `<Claim id="..." />` */
export const claims = {
	// holds only for precompiled ArkType, beside the per-benchmark claims
	headline: "The smallest, fastest validation, precompiled",
	// the fastest and the smallest builds differ: optimize "size" makes the
	// product schema's valid data 2.2x slower
	buildChoice:
		"Pick the build: the fastest validator or the smallest, from the same definitions.",
	// the homepage's spec rows, each a fragment of a claim below
	dynamicSpec: "as fast as precompiled on valid data at schemabenchmarks.dev",
	sizeSpec:
		"precompiled, smaller than Valibot on its own login form, with every error message",
	// the sentence under the docs' charts
	chartsSummary:
		"Precompiled ArkType is the fastest on moltar's parseSafe and assertLoose benchmarks, and on Valibot's own login form it reports every error, with its message, in a smaller bundle than Valibot.",
	// valid data, validation, parsing and Standard Schema, both modes:
	// 0.74-0.84x ata-validator's wall time, p <= 0.0063
	validData:
		"On schemabenchmarks.dev, precompiled and dynamic ArkType both validate valid data faster than ata-validator, its current #1.",
	// the product schema, valid data: 6003 vs 6002 instructions, wall a tie
	// (1.11, 3 of 12, p 0.15)
	dynamicSpeed:
		"On schemabenchmarks.dev's product schema, dynamic ArkType validates valid data as fast as precompiled ArkType.",
	// 66 vs 74 instructions; wall 0.94x ts-runtime-checks, 17 of 20, p 0.0026
	assertLoose:
		"Precompiled ArkType is the fastest on moltar's assertLoose benchmark.",
	// lean errors 912 vs 1475 B gz; default+lean 1.15 kB
	loginSize:
		"On Valibot's own login form, precompiled ArkType reports every error, with its message, in a smaller bundle than Valibot: 0.91 kB gzipped against 1.48 kB.",
	// moltar strict, dynamic, 2.2.3 to now: assertStrict 4067 -> 348,
	// parseStrict 3798 -> 392 instructions
	strictSpeedup:
		"Dynamic ArkType validates moltar's strict cases about 10 times faster than 2.2.",
	// 18 instructions, the harness floor; typia createIs 221
	noInit:
		"A precompiled Type costs nothing to create: it was built when you built."
} satisfies Record<string, Claim<string>>

export type ClaimId = keyof typeof claims

export interface Stat {
	value: Claim<string>
	label: Claim<string>
}

export const heroStats: Stat[] = [
	{
		value: "Fastest",
		label:
			"on moltar's parseSafe and assertLoose benchmarks, precompiled: 9% fewer instructions per call than the next library"
	},
	{
		value: "16% less time",
		label:
			"validating valid data than ata-validator, schemabenchmarks.dev's current #1, precompiled or not"
	},
	{
		value: "0.91 kB",
		label:
			"for Valibot's own login form with every error message, precompiled: smaller than Valibot's 1.48 kB gzipped"
	}
]
