/**
 * Every benchmark number or superlative the site states outside the
 * homepage's own benchmark (lib/bench), in one place so each can be checked
 * against the benchmark that backs it.
 *
 * A `pending` value is draft copy that isn't backed yet. It renders marked as
 * pending, so nothing unverified reads as a claim.
 */

import {
	ajvFasterElsewhere,
	benchFacts,
	list,
	versusLibrary,
	versusSchemaLibraries,
	type LibraryVersus
} from "./bench/bench.ts"

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
 * default build and size from the "smallest" preset, so the headline's note
 * names the build behind each.
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

// the homepage's login app as request handlers read it, bundled with
// bench/bundle.ts's esbuild settings in a production build: perf's user-space
// instructions from just before a fresh process imports the bundle to just
// after its first validation of valid data, less a bundle that validates
// nothing (ark/repo/bench/external/startup.ts). Planned before any count: 20
// rounds, a two-sided sign test per library paired by round, on Node 24 and
// 25. The default build had the fewest against all seven in 19-20 of 20 on
// both (p <= 4e-5); Node 24 medians at 4fd880692, which prunes a production
// bundle (results/startup-4fd880692-node24.json). On valibot.dev's login form
// it was 1.46M to Valibot's 2.36M, 20 of 20. Typia has fewer on the moltar
// app, Valibot on shop. No wall-clock run yet, so nothing says it starts
// faster.
export const startupChart: BenchmarkChart = {
	title: "Cold start",
	detail:
		"the homepage's login app, each library bundled with esbuild as a production build: instructions from importing the bundle to its first validation, beyond what loading an empty module costs, on Node 24. ArkType is precompiled with the default options",
	unit: "million instructions",
	source: {
		label: "the homepage's login app",
		href: "https://github.com/arktypeio/arktype/tree/main/ark/repo/bench/apps/login"
	},
	bars: [
		{ name: "ArkType (precompiled)", kind: "precompiled", value: 1.42 },
		{ name: "ajv", kind: "other", value: 1.86 },
		{ name: "Valibot", kind: "other", value: 2.35 },
		{ name: "Typia", kind: "other", value: 2.43 },
		{ name: "Zod Mini", kind: "other", value: 11.39 },
		{ name: "Zod", kind: "other", value: 43.73 },
		{ name: "Zod (compiled)", kind: "other", value: 51.55 },
		{ name: "TypeBox", kind: "other", value: 87.8 }
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

const valueOf = (chart: BenchmarkChart, name: string) =>
	chart.bars.find(bar => bar.name === name)!.value!

const kB = (bytes: number) => `${(bytes / 1000).toFixed(2)} kB`

const bytes = (n: number) => `${n.toLocaleString("en-US")} B`

// the options sizeChart's ArkType bar was built with
const sizeBuild = '"smallest" preset'

// valibot.dev's login form in 12 validators, each as its docs write it, by
// ark/repo/bench/external/forms/size.ts at 54eb5e89b (gzip -9,
// results/forms-54eb5e89b.json): ArkType, Valibot, Zod, Zod Mini, typia,
// TypeBox, Effect Schema, runtypes, Superstruct, Yup, Joi and ajv. Only these
// two were smaller than the default build's 1552 (Valibot 1564, Superstruct
// 1623, runtypes 5051): typia, whose errors carry its own messages rather
// than the form's, and ajv's standalone code with ajv-errors, generated from
// JSON Schema. The "smallest" preset was 1119 there. The email regex isn't
// why: both of theirs are longer and stricter than ArkType's
const formSize = { typia: 1252, ajv: 935 }

// the headline's speed scope, each checked so a rerun can't leave a sentence
// naming the wrong cause
const schemas = versusSchemaLibraries()
const schemaLosses = schemas.behind
if (
	schemaLosses.some(
		x =>
			x.library !== "zodCompiled" ||
			x.verdict !== "loss" ||
			!x.id.endsWith(" morph")
	)
) {
	throw new Error(
		`The headline's note says only z.compile's transform rows beat ArkType, but: ${JSON.stringify(schemaLosses)}`
	)
}
const ajvElsewhere = ajvFasterElsewhere()
if (ajvElsewhere.join() !== "parse items defaults") {
	throw new Error(
		`The headline's note says ajv's only valid-data win is items defaults, but it won: ${ajvElsewhere.join(", ")}`
	)
}

/** sentences, each rendered by `<Claim id="..." />` */
export const claims = {
	// scoped by the note below it, which says where it doesn't hold and why
	headline: "TypeScript's smallest, fastest validator.",
	// sizeChart, then formSize
	headlineSize: `*Smallest: we wrote valibot.dev's login form in 12 validators, each as its docs do. Of the TypeScript-schema libraries that attach the form's messages, ArkType's bundle is the smallest: ${bytes(valueOf(sizeChart, "ArkType (precompiled)"))} gzipped (${sizeBuild}) to Valibot's ${bytes(valueOf(sizeChart, "Valibot"))}. typia's is ${bytes(formSize.typia)} but can't carry the messages; ajv's, generated from JSON Schema, is ${bytes(formSize.ajv)} with ajv-errors.`,
	// speedChart's counts and H1/H2 of the registered wall run
	// (wall-f29b8d153.md): each beat all six rivals within 25% of its
	// instructions, in 24-30 of 30 passes (p <= 0.0014); then the homepage's
	// benchmark against every library but ajv
	headlineSpeed: `Fastest: precompiled with its defaults, ArkType takes the fewest instructions per call of any library on moltar's parseSafe and assertLoose benchmarks in our Node 24 runs, and beat the six closest on each by wall clock, in a test we registered before running it. On the homepage's benchmark, it's faster than every TypeScript-schema library in ${schemas.ahead} of ${schemas.count} scenarios, with errors: "first" on the ${schemas.firstErrorCount} that report one error.`,
	// moltar strict, default build: parseStrict 339 instructions (ata-aot 297,
	// ata 302, @ts-runtypes 302, typia 335), assertStrict 332 (also TypeBox
	// AOT 331). Each of those counts keys (for...in, Object.keys or
	// getOwnPropertyNames length); ata-aot and @ts-runtypes were shown to
	// accept an extra key beside a non-enumerable declared one. jsonInput:
	// 285 and 251, instructions only (perf-parse batch8, no wall run). ajv's
	// error rows: its messages are constants with the path kept apart, and
	// ArkType pays an Allows walk before Apply's (error-path.md's counts)
	headlineLimits: `Not everywhere: on moltar's strict benchmarks, the libraries that take fewer instructions count an object's keys, which lets an undeclared key pass in place of a non-enumerable or inherited declared one. ArkType checks each key; set jsonInput for data from JSON.parse and it counts too, taking the fewest instructions on both. On the homepage's benchmark, z.compile is faster on the ${schemaLosses.length} scenarios that transform their input (${list(schemaLosses.map(x => x.ratio))}). ajv is faster on ${bench.ajvFasterCount} of the ${bench.errorCount} that report errors, since ArkType checks invalid input a second time to collect them and puts each error's path in its message, and on items defaults, where ajv writes defaults into its input rather than a copy.`,
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
		"With the skill, one prompt fully migrated 4 of 10 open-source Zod projects we picked by stars before running it: typecheck and tests pass, Zod is gone, generated inputs get the same results and no casts were added.",
	// the homepage board's title, a phrase per category: ships less (sizeChart),
	// starts lighter (startupChart, instructions rather than time) and runs
	// faster (H1's wall clock). The categories' builds differ, so it doesn't
	// say one build is all three; once they match, the board stamps "one
	// build" and this can say so too
	boardTitle: "Ships less. Starts lighter. Runs faster.",
	// the board's: sizeChart against Zod and Valibot alone
	sizeVersus: `On valibot.dev's login form as written, with its messages, ArkType precompiled for size is ${kB(valueOf(sizeChart, "ArkType (precompiled)"))} gzipped, against Valibot's ${kB(valueOf(sizeChart, "Valibot"))}, Zod Mini's ${kB(valueOf(sizeChart, "Zod Mini"))} and Zod's ${kB(valueOf(sizeChart, "Zod"))}.`,
	// startupChart against Zod and Valibot alone: fewer than each of them in
	// 20 of 20 rounds on both Nodes, on the login app and on the form
	startupVersus: `On the homepage's login app, precompiled ArkType takes ${valueOf(startupChart, "ArkType (precompiled)")}M instructions from import to its first validation, beyond loading an empty module, against Valibot's ${valueOf(startupChart, "Valibot")}M, Zod Mini's ${valueOf(startupChart, "Zod Mini")}M, Zod's ${valueOf(startupChart, "Zod")}M and compiled Zod's ${valueOf(startupChart, "Zod (compiled)")}M: fewer than each in all 20 paired runs on Node 24 and 25.`,
	// startupChart; the form is 1.46M vs Valibot's 2.36M, 20 of 20
	startupLogin:
		"On the homepage's login app, precompiled ArkType spends fewer instructions from import to its first validation than ajv, Valibot, Typia, Zod Mini, Zod, compiled Zod or TypeBox, in at least 19 of 20 paired runs on Node 24 and 25.",
	// speedChart and H1
	parseSafe:
		"On moltar's parseSafe benchmark, precompiled ArkType takes the fewest instructions per call, and by wall clock it was faster than each of the six libraries closest to it, Typia among them, in at least 28 of 30 paired runs."
} satisfies Record<string, Claim<string>>

export type ClaimId = keyof typeof claims

/** the headline's note: what it measures, then where it doesn't hold */
export const headlineNote = [
	"headlineSize",
	"headlineSpeed",
	"headlineLimits"
] as const satisfies ClaimId[]

/** the libraries the board compares against: with ArkType, the two that wrote Standard Schema */
const isRival = (bar: BenchmarkBar) => /^(Valibot|Zod)\b/.test(bar.name)

type CategoryBase = {
	/** what it measures */
	label: string
	/** the options ArkType's numbers were built with */
	build: string
	claim: Claim<string>
	source: BenchmarkChart["source"]
}

/** a category measured once per library, drawn as bars */
export type BarCategory = CategoryBase & {
	id: "size" | "startup"
	/** ArkType's bar, then each rival's */
	bars: BenchmarkBar[]
	unit: string
	/** a bar's value, without its unit */
	format: (value: number) => string
	/** what ArkType's multiple of Zod is: "smaller than" */
	margin: string
}

/** a category measured per scenario, drawn as each scenario's ratio */
export type SpreadCategory = CategoryBase & {
	id: "speed"
	/** each rival on every scenario of the homepage's benchmark */
	versus: { name: string; versus: LibraryVersus }[]
}

export type Category = BarCategory | SpreadCategory

const onBoard = (chart: BenchmarkChart) =>
	chart.bars.filter(bar => bar.kind === "precompiled" || isRival(bar))

/** the homepage's board: each category against Zod and Valibot, every number from a chart above */
export const categories: Category[] = [
	{
		id: "size",
		label: "bundle size",
		build: sizeBuild,
		bars: onBoard(sizeChart),
		unit: "kB gzipped",
		format: kB,
		margin: "smaller than",
		claim: claims.sizeVersus,
		source: sizeChart.source
	},
	{
		id: "startup",
		label: "cold start",
		build: "default build",
		bars: onBoard(startupChart),
		unit: "million instructions",
		format: n => `${n}M`,
		margin: "less startup work than",
		claim: claims.startupVersus,
		source: startupChart.source
	},
	{
		id: "speed",
		label: "validation",
		build: "default build",
		versus: [
			{ name: "Zod", versus: zod },
			{ name: "Zod (compiled)", versus: zodCompiled },
			{ name: "Zod Mini", versus: versusLibrary("zodMini") },
			{ name: "Valibot", versus: versusLibrary("valibot") }
		],
		claim: claims.zodSpeed,
		source: { label: "the benchmark below", href: "#run" }
	}
]

/** whether one build holds every category, the only time the board may say so */
export const oneBuild = new Set(categories.map(c => c.build)).size === 1
