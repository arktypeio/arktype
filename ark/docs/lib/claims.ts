/**
 * Every benchmark number or superlative the site states outside the
 * homepage's own benchmark (lib/bench), in one place so each can be checked
 * against the benchmark that backs it.
 *
 * A `pending` value is draft copy that isn't backed yet. It renders marked as
 * pending, so nothing unverified reads as a claim.
 */

import { benchFacts, versusLibrary, type LibraryVersus } from "./bench/bench.ts"
import {
	leaderboards,
	leads,
	type CategoryId,
	type Standing
} from "./bench/leaderboard.ts"

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
 * without errors. The headline's superlatives and the board's standings
 * instead follow the README's "Best average" rule over every suite
 * (lib/bench/leaderboard.ts), with ArkType as its default production build
 * throughout, each of its rows measured at 7daf33b7e.
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
// rounds, a two-sided sign test per library paired by round. Node 24 medians
// at 7daf33b7e (results/startup-7daf33b7e-node24.json): the default build had
// the fewest against all seven in 20 of 20 (p 1.9e-6), as it had in 19-20 of
// 20 on Node 24 and 25 at 4fd880692. On valibot.dev's login form it was 1.18M
// to Valibot's 2.36M and on shop 10.77M to Valibot's 12.26M, 20 of 20; Typia
// has fewer on the moltar app, 1.16M to 1.17M. No wall-clock run yet, so
// nothing says it starts faster.
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
		{ name: "ArkType (precompiled)", kind: "precompiled", value: 1.13 },
		{ name: "ajv", kind: "other", value: 1.86 },
		{ name: "Valibot", kind: "other", value: 2.35 },
		{ name: "Typia", kind: "other", value: 2.43 },
		{ name: "Zod Mini", kind: "other", value: 11.39 },
		{ name: "Zod", kind: "other", value: 43.75 },
		{ name: "Zod (compiled)", kind: "other", value: 51.54 },
		{ name: "TypeBox", kind: "other", value: 87.79 }
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
// z.compile builds its output as it transforms; arktype's Types on the rows
// that transform their input kept undeclared keys, copying each object a
// transform changed, until they removed them as Zod does
const zodCompiledLosses =
	!zodCompiled.lost.length ? ""
	: zodCompiled.lost.every(s => s.name.endsWith(" morph")) ?
		`. z.compile was faster on the ${zodCompiled.lost.length} that transform their input, ${zodCompiled.losses}`
	:	`. z.compile was faster on ${zodCompiled.losses}`
const bench = benchFacts()

const valueOf = (chart: BenchmarkChart, name: string) =>
	chart.bars.find(bar => bar.name === name)!.value!

const ordinal = (n: number) =>
	n % 10 === 1 && n % 100 !== 11 ? `${n}st`
	: n % 10 === 2 && n % 100 !== 12 ? `${n}nd`
	: n % 10 === 3 && n % 100 !== 13 ? `${n}rd`
	: `${n}th`

const placeOf = (category: CategoryId) => {
	const { standings } = leaderboards[category]
	const i = standings.findIndex(s => s.library === "ArkType")
	return { place: i + 1, ranked: standings.length, ...standings[i] }
}

// a category's superlative, which the board states only where ArkType leads.
// Bundle size has none until its framing is decided
const superlatives: Partial<Record<CategoryId, string>> = {
	speed: "Fastest",
	startup: "Quickest to start"
}

/** where ArkType's best average places it in a category, a superlative only where it leads */
const standingOf = (category: CategoryId) => {
	const across = `across ${leaderboards[category].suites.length} public benchmarks`
	const superlative = leads(category) ? superlatives[category] : undefined
	if (superlative)
		return { leads: true, standing: `${superlative} on average ${across}` }
	const { place, ranked } = placeOf(category)
	return {
		leads: false,
		standing: `${ordinal(place)} of ${ranked} on average ${across}`
	}
}

const size = placeOf("size")
const sizeLeader = leaderboards.size.standings[0]

/** sentences, each rendered by `<Claim id="..." />` */
export const claims = {
	// each superlative names a category ArkType must have the best average in
	// (lib/bench/leaderboard.ts), as headlineCategories below checks. Pending:
	// ArkType leads speed and startup, and is second on size (Valibot 1.360,
	// ArkType 1.462), whose framing is open
	headline: { pending: "TypeScript's smallest, fastest validator." },
	headlineNote: `*Best average across public benchmarks, each result a ratio to the best: ${leaderboards.speed.rows} results for validation speed, ${leaderboards.startup.rows} for startup and ${leaderboards.size.rows} for bundle size.`,
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
	// the homepage board's title, a phrase per category ArkType leads: runs
	// faster (H1's wall clock) and starts lighter (startupChart, instructions
	// rather than time). Valibot's average bundle is smaller, so nothing says
	// it ships less
	boardTitle: "Runs faster. Starts lighter.",
	// what the board's superlatives average
	boardNote: `*Best average across public benchmarks, each result a ratio to the best: ${leaderboards.speed.rows} results for validation speed and ${leaderboards.startup.rows} for startup.`,
	// the board's size standing, which claims no lead
	sizeStanding: `${sizeLeader.library} has the best average bundle size, ${sizeLeader.score.toFixed(2)}, against the default build's ${size.score.toFixed(2)}.`,
	// startupChart against Zod and Valibot alone: fewer than each of them in
	// 20 of 20 rounds on both Nodes, on the login app and on the form
	startupVersus: `On the homepage's login app, precompiled ArkType takes ${valueOf(startupChart, "ArkType (precompiled)")}M instructions from import to its first validation, beyond loading an empty module, against Valibot's ${valueOf(startupChart, "Valibot")}M, Zod Mini's ${valueOf(startupChart, "Zod Mini")}M, Zod's ${valueOf(startupChart, "Zod")}M and compiled Zod's ${valueOf(startupChart, "Zod (compiled)")}M: fewer than each in all 20 paired runs on Node 24.`,
	// startupChart; the form is 1.18M vs Valibot's 2.36M, 20 of 20
	startupLogin:
		"On the homepage's login app, precompiled ArkType spends fewer instructions from import to its first validation than ajv, Valibot, Typia, Zod Mini, Zod, compiled Zod or TypeBox, in all 20 paired runs on Node 24.",
	// speedChart and H1
	parseSafe:
		"On moltar's parseSafe benchmark, precompiled ArkType takes the fewest instructions per call, and by wall clock it was faster than each of the six libraries closest to it, Typia among them, in at least 28 of 30 paired runs."
} satisfies Record<string, Claim<string>>

export type ClaimId = keyof typeof claims

/** the README section listing the headline's benchmarks and its rule */
export const headlineMethod = {
	label: "Method",
	href: "https://github.com/arktypeio/arktype/blob/main/ark/repo/bench/external/README.md#best-average"
}

const assertLeads = (category: CategoryId, by: string) => {
	if (!leads(category)) {
		throw new Error(
			`${by} claims ArkType is best on ${category}, but ${leaderboards[category].standings[0].library} has the best average: ${JSON.stringify(leaderboards[category].standings.slice(0, 5))}`
		)
	}
}

// the categories the headline's superlatives name, each of which ArkType
// must lead on average once the headline isn't pending
const headlineCategories: CategoryId[] = ["size", "speed"]
if (!isPending(claims.headline))
	for (const category of headlineCategories)
		assertLeads(category, "The headline")

// the board's title and note
for (const category of ["speed", "startup"] as const)
	assertLeads(category, "The board")

/** the libraries the board compares against: with ArkType, the two that wrote Standard Schema */
const isRival = (bar: BenchmarkBar) => /^(Valibot|Zod)\b/.test(bar.name)

type CategoryBase = {
	/** what it measures */
	label: string
	/** the options ArkType's numbers were built with */
	build: string
	/** where ArkType's best average places it */
	standing: string
	/** whether the standing is a superlative, footnoted by the board's note */
	leads: boolean
	claim: Claim<string>
	source: BenchmarkChart["source"]
}

/** a category measured once per library, drawn as bars */
export type BarCategory = CategoryBase & {
	id: "startup"
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

/** a category drawn as its best averages, ArkType's among them */
export type StandingCategory = CategoryBase & {
	id: "size"
	/** ArkType's place: "2nd" */
	place: string
	/** how many libraries the category ranks */
	ranked: number
	/** the leaders, through ArkType and one past it */
	standings: Standing[]
}

export type Category = BarCategory | SpreadCategory | StandingCategory

const onBoard = (chart: BenchmarkChart) =>
	chart.bars.filter(bar => bar.kind === "precompiled" || isRival(bar))

/** the homepage's board: each category against Zod and Valibot, every number from a chart above */
export const categories: Category[] = [
	{
		id: "speed",
		label: "validation",
		build: "default build",
		...standingOf("speed"),
		versus: [
			{ name: "Zod", versus: zod },
			{ name: "Zod (compiled)", versus: zodCompiled },
			{ name: "Zod Mini", versus: versusLibrary("zodMini") },
			{ name: "Valibot", versus: versusLibrary("valibot") }
		],
		claim: claims.zodSpeed,
		source: { label: "the benchmark below", href: "#run" }
	},
	{
		id: "startup",
		label: "cold start",
		build: "default build",
		...standingOf("startup"),
		bars: onBoard(startupChart),
		unit: "million instructions",
		format: n => `${n}M`,
		margin: "less startup work than",
		claim: claims.startupVersus,
		source: startupChart.source
	},
	{
		id: "size",
		label: "bundle size",
		build: "default build",
		...standingOf("size"),
		place: ordinal(size.place),
		ranked: size.ranked,
		standings: leaderboards.size.standings.slice(0, size.place + 1),
		claim: claims.sizeStanding,
		source: headlineMethod
	}
]

/** whether one build holds every category, the only time the board may say so */
export const oneBuild = new Set(categories.map(c => c.build)).size === 1
