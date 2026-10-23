/**
 * Every benchmark number or superlative the site states outside the
 * homepage's own benchmark (lib/bench), in one place so each can be checked
 * against the benchmark that backs it.
 *
 * A `pending` value is draft copy that isn't backed yet. It renders marked as
 * pending, so nothing unverified reads as a claim.
 */

import { benchFacts, versusLibrary } from "./bench/bench.ts"

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
 * Measured on Node 24.14.1 by the plan and harness in
 * ark/repo/bench/external, against moltar's typescript-runtime-type-benchmarks
 * at 499f3fb and schema-benchmarks at f1e6e8e. Its results/ holds the
 * instruction counts (counts-a306152ce.md, whose builds match the release's),
 * the sizes (login-89510709d.json) and the pre-registered wall-clock run at
 * f29b8d153 (wall-f29b8d153.md: 30 paired passes, Holm over H1-H4), where all
 * four hypotheses held. At the release candidate (wall.md) H1 had failed. Each
 * claim is scoped: precompiled or dynamic, valid or invalid data, with or
 * without errors. Speed comes from the
 * default build and size from the "smallest" preset, so no claim says one
 * build is both.
 */

// moltar's typescript-runtime-type-benchmarks, perf instruction counts in
// benny's call shape, the default build. By wall clock (H1, p 8.7e-7), it
// beat every rival within 25% of its instructions in 28-29 of 30 passes:
// @ts-runtypes, Typia, ata-validator (AOT) and ata in about 0.83x their time,
// rescript-schema in 0.90x and @sx3/gate in 0.92x.
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
		{ name: "ArkType (precompiled)", kind: "precompiled", value: 184 },
		{ name: "@ts-runtypes", kind: "other", value: 209 },
		{ name: "Typia", kind: "other", value: 213 },
		{ name: "ArkType (dynamic)", kind: "dynamic", value: 216 },
		{ name: "ata-validator (AOT)", kind: "other", value: 220 }
	]
}

// bundlejs-style esbuild of valibot.dev's login form as written, every entry
// reporting every error with its message. Precompiled with
// { preset: "smallest" } in a production build (esbuild's "production"
// condition): 2647 / 1313 B min / gz; 2927 / 1465 in development, and the
// default build 1779 in production. Sizes measured at 89510709d
// (results/login-89510709d.json). Zod Mini's form is valibot.dev's code as
// written, which throws at its first parse on zod 4.6.7 (z.check takes no
// schema); written to run (z.email(...).check(...)), it is 5107.
export const sizeChart: BenchmarkChart = {
	title: "Bundle size",
	detail:
		"the login form as valibot.dev writes it, with its messages, bundled by us with bundlejs's esbuild settings; each reports every error. ArkType is precompiled with the \"smallest\" preset in a production build. Zod Mini's form, as valibot.dev writes it, throws at its first parse; written so it runs, it is the same size within 20 B",
	unit: "B gzipped",
	source: {
		label: "the form from valibot.dev's comparison",
		href: "https://valibot.dev/guides/comparison/"
	},
	axisMax: 26_000,
	bars: [
		{ name: "ArkType (precompiled)", kind: "precompiled", value: 1313 },
		{ name: "Valibot", kind: "other", value: 1547 },
		{ name: "Zod Mini", kind: "other", value: 5127 },
		{ name: "Zod", kind: "other", value: 25058 },
		{ name: "ArkType (dynamic)", kind: "dynamic", value: 82263 }
	]
}

// the homepage's benchmark (lib/bench/benchData.json), so a rerun rewrites
// these too: the default build against classic Zod 4 and z.compile on every
// scenario, each verdict a sign test at p < .05 over 20 paired passes, each running
// every library in a fresh process
const zod = versusLibrary("zod")
const zodCompiled = versusLibrary("zodCompiled")
const zodScenarios =
	zod.wins === zod.count ?
		`all ${zod.count} scenarios`
	:	`${zod.wins} of ${zod.count} scenarios`
// z.compile builds its output as it transforms, where arktype copies each
// object it changes, so it wins the rows that transform their input
const zodCompiledLosses =
	!zodCompiled.lost.length ? ""
	: zodCompiled.lost.every(s => s.name.endsWith(" morph")) ?
		`. z.compile was faster on the ${zodCompiled.lost.length} that transform their input, ${zodCompiled.losses}`
	:	`. z.compile was faster on ${zodCompiled.losses}`
const bench = benchFacts()

/** sentences, each rendered by `<Claim id="..." />` */
export const claims = {
	// precompiled ArkType: moltar's parseSafe, 184 instructions vs Typia 213;
	// by wall clock (H1) faster than Typia in 29 of 30 passes (0.84x) and than
	// every other close rival in at least 28. valibot.dev's login form as
	// written, 1313 vs Valibot 1547 B gz
	headline: "Faster than Typia. Smaller than Valibot.",
	headlineDetail:
		"Precompiled from the same definitions: fastest on moltar's parseSafe benchmark in our runs, and every error with its message on valibot.dev's login form in 1.31 kB.",
	headlineNote:
		"*Speed: moltar's parseSafe benchmark on valid data, run by us on Node 24 with the default build: 184 instructions per call, Typia 213. By wall clock it was faster than each of the six libraries closest to it in instructions, Typia among them, in at least 28 of 30 paired runs. ajv is faster on some invalid-data rows. Size: valibot.dev's login form as written, with its messages, bundled with bundlejs's esbuild settings and precompiled for size with the \"smallest\" preset in a production build: 1.31 kB gzipped, Valibot 1.55 kB.",
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
	// the product schema, valid data: 6005 vs 6003 instructions; by wall clock
	// (H3), dynamic took 0.999x the default build's time and stayed under 1.05x
	// in 24 of 30 passes (p 0.00072)
	dynamicSpeed:
		"In our runs of schemabenchmarks.dev's product schema, dynamic ArkType validates valid data as fast as precompiled ArkType.",
	// "smallest" in production, 1313 vs 1547 B gz, the form as written
	loginSize:
		"On Valibot's own login form, ArkType precompiled for size reports every error, with its message, in a smaller bundle than Valibot: 1.31 kB gzipped against 1.55 kB.",
	// moltar strict, dynamic, 2.2.9 to now: assertStrict 5326 -> 348,
	// parseStrict 4277 -> 365 instructions (2.2.9's counts vary by 20-26%
	// between reps, its ratios 10.2x to 17.1x); by wall clock (H4), 0.074x
	// 2.2.9's time on assertStrict, under 0.2x in 30 of 30 passes
	strictSpeedup:
		"Dynamic ArkType validates moltar's strict cases about 10 times faster than 2.2.",
	// 18 instructions, the harness floor; typia createIs 221
	noInit:
		"A precompiled Type costs nothing to create: it was built when you built.",
	// `import { type } from "arktype"` by ark/repo/bench/bundle.ts's method
	// (esbuild bundle + minify, esm, neutral, gzip) at f29b8d153: 82292 vs
	// 2.2.9's 47803 B gz (258336 vs 156113 min); sizeChart's dynamic bar, the
	// login form, is 82263
	dynamicSize:
		"Dynamic ArkType is 82.3 kB gzipped, minified with esbuild, up from 47.8 kB in 2.2.9, so precompile to ship less.",
	zodSpec: `faster than Zod 4 in ${zodScenarios} we ran`,
	zodSpeed: `Precompiled ArkType was faster than Zod 4 in ${zodScenarios} of our benchmark, by ${zod.min} to ${zod.max}, and faster than Zod 4's z.compile in ${zodCompiled.wins} of ${zodCompiled.count}${zodCompiledLosses}.`,
	// the error rows from benchData.json
	speedScope: `It isn't the fastest at everything. On the rows that report errors for invalid data, ajv was faster on ${bench.ajvFasterCount} of ${bench.errorCount}.`,
	// no rate: 4 of 10 can't headline a row
	zodMigrationSpec: "a guide your agent follows from one prompt",
	// h2 in the Zod-migration eval: 10 repos chosen by a rule fixed before any
	// run (stars, 3-30 files importing zod), one Sonnet run each with the skill
	// at fc054f29f, graded on typecheck, tests, zod removed, differential parity
	// and no new casts. 4/10, 95% CI 0.12-0.74; 2 of the failures keep Zod for
	// MCP SDK v1
	zodMigration:
		"With the skill, one prompt fully migrated 4 of 10 open-source Zod projects we picked by stars before running it: typecheck and tests pass, Zod is gone, generated inputs get the same results and no casts were added."
} satisfies Record<string, Claim<string>>

export type ClaimId = keyof typeof claims
