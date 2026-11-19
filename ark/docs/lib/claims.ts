/**
 * Every benchmark number or superlative the site states outside the
 * homepage's own benchmark (lib/bench), in one place so each can be checked
 * against the benchmark that backs it.
 *
 * A `pending` value is draft copy that isn't backed yet. It renders marked as
 * pending, so nothing unverified reads as a claim.
 */

import {
	benchFacts,
	formatRatio,
	list,
	versusLibrary,
	type LibraryVersus
} from "./bench/bench.ts"
import {
	formBuilds,
	fullLeaderboards,
	independentRowsOf,
	isOwnSuite,
	isWellKnown,
	isWrittenByUs,
	measured,
	pairedP,
	resultsOf,
	startupPaired,
	unnamed,
	wellKnownDownloads,
	wellKnownRule,
	type CategoryId
} from "./bench/leaderboard.ts"
import {
	bestRivalOf,
	bestSweepOf,
	generatedComplete,
	generatedRows,
	marginOf,
	ntwineRows,
	rivalsOf,
	scoreboard,
	sweepOf,
	type AppRow,
	type Build,
	type Host,
	type Measure,
	type Sweep
} from "./bench/scoreboard.ts"
import {
	firstDependsOn,
	isFirstOutright,
	sourcesOf,
	unitBoards,
	unitText,
	type UnitStanding
} from "./bench/units.ts"
import buildTime from "./bench/buildTime.json" with { type: "json" }
import presetScale from "./bench/presetScale.json" with { type: "json" }

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
 * instruction counts (counts-a306152ce.md; ArkType's recounted at 20710020e in
 * arktype-20710020e.json), the sizes (login-20710020e.json) and the
 * pre-registered wall-clock run at
 * f29b8d153 (wall-f29b8d153.md: 30 paired passes, Holm over H1-H4), where all
 * four hypotheses held. At the release candidate (wall.md) H1 had failed. Each
 * claim is scoped: precompiled or dynamic, valid or invalid data, with or
 * without errors. The headline's superlatives and the board's standings
 * instead follow the board's one rule (lib/bench/units.ts): other projects'
 * benchmarks, each library's geometric mean over the largest set of results
 * that ArkType, Zod and three more named libraries all ran, in plain order,
 * with ArkType as its default production build throughout, every one of its
 * rows measured at 20710020e.
 */

// moltar's typescript-runtime-type-benchmarks, perf instruction counts in
// benny's call shape, the default build: at 20710020e 184.6 on parseSafe, 66
// on assertLoose, dynamic 199.6 (216 at a306152ce); rivals' counts are
// a306152ce's. By wall clock at f29b8d153 (H1, p 8.7e-7), it
// beat every rival within 25% of its instructions in 28-29 of 30 passes:
// @ts-runtypes, Typia, ata-validator (AOT) and ata in about 0.83x their time,
// rescript-schema in 0.90x and @sx3/gate in 0.92x.
export const speedChart: BenchmarkChart = {
	title: "Runtime",
	detail:
		"moltar's parseSafe benchmark (validate, removing undeclared keys), run by us on Node 24, ArkType precompiled with the default options. Precompiled ArkType isn't in moltar's published results yet.",
	unit: "instructions per call",
	source: {
		label: "moltar/typescript-runtime-type-benchmarks",
		href: "https://github.com/moltar/typescript-runtime-type-benchmarks"
	},
	bars: [
		{ name: "ArkType (precompiled)", kind: "precompiled", value: 185 },
		{ name: "ArkType (dynamic)", kind: "dynamic", value: 200 },
		{ name: "@ts-runtypes", kind: "other", value: 209 },
		{ name: "Typia", kind: "other", value: 213 },
		{ name: "ata-validator (AOT)", kind: "other", value: 220 }
	]
}

// valibot.dev's login form, written in each library as its docs do and bundled
// with bundlejs's esbuild settings in a production build (esbuild's
// "production" condition), which prunes a precompiled validator to what the
// form uses (ark/repo/bench/external/forms/size.ts). Each bundle exports a
// validate that reports an error for every invalid field with the form's
// messages (a blank password gets ArkType's one, where Valibot also says it's
// empty). Every bar is leaderboard.json's, so a rerun redraws the chart and
// rewrites every sentence that states a byte of it: the form's row, which the
// board's size graph averages, and for dynamic ArkType the form suite's
// `builds`. At 20710020e the default build is 1026 B gz and the "smallest"
// preset 996. Zod Mini's form is written so it runs: valibot.dev's code for
// it throws at its first parse on zod 4.6.7 (z.check takes no schema).
const loginForm = resultsOf("form", "login form")

/** a library's gzipped bytes on valibot.dev's login form */
const loginBytes = (library: string) => {
	if (!(library in loginForm)) {
		throw new Error(
			`leaderboard.json's login form has no result for ${library}`
		)
	}
	return loginForm[library]
}

export const sizeChart: BenchmarkChart = {
	title: "Bundle size",
	detail:
		"the login form as valibot.dev writes it, with its messages, bundled by us with bundlejs's esbuild settings; each reports an error for every invalid field. ArkType is precompiled with its default options in a production build. Zod Mini's form is written so it runs: as valibot.dev writes it, it throws at its first parse",
	unit: "bytes gzipped",
	source: {
		label: "the form from valibot.dev's comparison",
		href: "https://valibot.dev/guides/comparison/"
	},
	// the next thousand bytes past classic Zod's bar, which dynamic ArkType's
	// runs past
	axisMax: Math.ceil(loginBytes("Zod") / 1000) * 1000,
	bars: [
		{
			name: "ArkType (precompiled)",
			kind: "precompiled",
			value: loginBytes("ArkType")
		},
		{ name: "Valibot", kind: "other", value: loginBytes("Valibot") },
		{ name: "Zod Mini", kind: "other", value: loginBytes("Zod Mini") },
		{ name: "Zod", kind: "other", value: loginBytes("Zod") },
		{ name: "ArkType (dynamic)", kind: "dynamic", value: formBuilds.dynamic }
	]
}

/**
 * whether the default build's bundle of the login form is smaller than
 * Valibot's, which every sentence that says so needs
 */
const smallerThanValibot = loginBytes("ArkType") < loginBytes("Valibot")

/** a sentence that says so, draft copy while the row doesn't back it */
const whileSmallerThanValibot = (text: string): Claim<string> =>
	smallerThanValibot ? text : { pending: text }

/** a library's bundle of the login form in kilobytes, as the size claims write them: "1.03" */
const loginKb = (library: string) => unitText.kilobytes(loginBytes(library))

// the homepage's login app as request handlers read it, bundled with
// bench/bundle.ts's esbuild settings in a production build: perf's user-space
// instructions from just before a fresh process imports the bundle to just
// after its first validation of valid data, less a bundle that validates
// nothing (ark/repo/bench/external/startup.ts). Planned before any count: 20
// rounds, a two-sided sign test per library paired by round. Node 24 medians
// at 20710020e (results/startup-20710020e-node24.json), Typia included: the
// default build had the fewest on every app against every library, 20 of 20
// (p 1.9e-6), as at 781130da3 and in 19-20 of 20 at 90d510484. On
// valibot.dev's login form it was 0.88M to Valibot's 2.34M, on the login app
// 0.87M to ajv's 1.86M, on shop 9.85M to Valibot's 12.16M, and on the moltar
// app 0.98M to Typia's 1.15M. No wall-clock run yet, so nothing says it
// starts faster.
const startupChart: BenchmarkChart = {
	title: "Cold start",
	detail:
		"the homepage's login app, each library bundled with esbuild as a production build: instructions from importing the bundle to its first validation, beyond what loading an empty module costs, on Node 24. ArkType is precompiled with the default options",
	unit: "million instructions",
	source: {
		label: "the homepage's login app",
		href: "https://github.com/arktypeio/arktype/tree/main/ark/repo/bench/apps/login"
	},
	// the leaderboard's login row, net of the baseline, in millions
	bars: Object.entries(resultsOf("startup", "login"))
		.sort(([, l], [, r]) => l - r)
		.map(
			([library, instructions]): BenchmarkBar => ({
				name: library === "ArkType" ? "ArkType (precompiled)" : library,
				kind: library === "ArkType" ? "precompiled" : "other",
				value: Math.round(instructions / 10_000) / 100
			})
		)
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

/** the median of a library's ratios to the default build across the scenarios both ran */
export const medianOf = ({ rows }: LibraryVersus) => {
	const ratios = rows.map(row => row.speedup).sort((l, r) => l - r)
	const mid = ratios.length >> 1
	return formatRatio(
		ratios.length % 2 ? ratios[mid] : (ratios[mid - 1] + ratios[mid]) / 2
	)
}

export const ordinal = (n: number) =>
	n % 10 === 1 && n % 100 !== 11 ? `${n}st`
	: n % 10 === 2 && n % 100 !== 12 ? `${n}nd`
	: n % 10 === 3 && n % 100 !== 13 ? `${n}rd`
	: `${n}th`

/** ArkType on a category's graph: its geometric mean, and its place among every library the graph ranks */
const placeOf = (category: CategoryId) => {
	const { standings } = unitBoards[category]
	return {
		...standings.find(s => s.library === "ArkType")!,
		ranked: standings.length
	}
}

/** how the board words each category: its superlative, its title phrase and what its rows measure */
const wording = {
	speed: {
		superlative: "Fastest",
		phrase: "Runs faster.",
		measures: "validation speed"
	},
	startup: {
		superlative: "Quickest to start",
		phrase: "Starts lighter.",
		measures: "startup"
	},
	size: {
		superlative: "Smallest",
		phrase: "Ships less.",
		measures: "bundle size"
	}
} satisfies Record<CategoryId, Record<string, string>>

const boardOrder = ["speed", "startup", "size"] as const satisfies CategoryId[]

// startup.ts, ours: instructions from import through the first validation of
// whole apps, net of an empty bundle, in rounds that each run every arm
const startupWins = startupPaired?.wins ?? {}
const startupRounds = startupPaired?.rounds ?? 0
const startupApps = Object.keys(startupWins)

/** whether the default build started an app with fewer instructions than a library: the lower median, in a significant share of paired rounds */
const startsBefore = (app: string, library: string) =>
	resultsOf("startup", app).ArkType < resultsOf("startup", app)[library] &&
	pairedP(startupWins[app][library], startupRounds) < 0.05

/**
 * whether the default build started every app before every library, which
 * "Quickest to start" needs as well as the board's standing: the public
 * startup results time only creating a schema, which a precompiled build skips
 */
const startsFirst =
	startupApps.length > 0 &&
	startupApps.every(app =>
		Object.keys(startupWins[app]).every(library => startsBefore(app, library))
	)

/** whether ArkType has the lowest geometric mean on a category's graph, shared with no one */
const leads = (category: CategoryId) =>
	isFirstOutright(unitBoards[category].standings, "ArkType")

/**
 * whether ArkType may claim a category: first outright on its graph, by the
 * board's rule (lib/bench/units.ts), in plain order; and for startup,
 * startsFirst
 */
const claimsLead = (category: CategoryId) =>
	leads(category) && (category !== "startup" || startsFirst)

/** the categories ArkType may claim, the only ones the board states a win in */
const led = boardOrder.filter(claimsLead)

/** whether ArkType may claim every category the board shows, the only time it may say "Pick 3" */
export const leadsEvery = led.length === boardOrder.length

/**
 * ArkType's geometric mean on a category's graph, the next best's where
 * ArkType is first, otherwise the leader's, and the best of the other
 * libraries the site may name
 */
const averageOf = (category: CategoryId) => {
	const { place, value } = placeOf(category)
	const others = unitBoards[category].standings.filter(
		s => s.library !== "ArkType"
	)
	return {
		value,
		other: place === 1 ? others[0] : unitBoards[category].standings[0],
		named: others.find(s => isWellKnown(s.library))!
	}
}

const namingNote = `We name only libraries with ${wellKnownRule}; every place and average counts all of them.`

const leadText = (score: number, next: number) => {
	const percent = (1 - score / next) * 100
	return percent < 0.1 ? "less than 0.1%" : `${percent.toFixed(1)}%`
}

/** "2 independent benchmarks", "1 independent benchmark" */
const independentBenchmarks = (n: number) =>
	`${n} independent benchmark${n === 1 ? "" : "s"}`

/**
 * What a category's graph averages: how many results, from how many
 * benchmarks. One that averages a benchmark whose code for each library we
 * wrote names every benchmark instead, since that one isn't independent.
 */
const acrossOf = (category: CategoryId) => {
	const board = unitBoards[category]
	const sources = sourcesOf(board).map(source => source.label)
	return sources.some(isWrittenByUs) ?
			`across ${list(sources)}`
		:	`across ${board.rows.length} results from ${independentBenchmarks(sources.length)}`
}

/** where ArkType's geometric mean places it on a category's graph, a superlative only where it is first outright */
const standingOf = (category: CategoryId) => {
	const { place, ranked } = placeOf(category)
	const average = averageOf(category)
	const by = leads(category) ? leadText(average.value, average.other.value) : ""
	return {
		leads: leads(category),
		place: ordinal(place),
		ranked,
		average,
		by,
		standing:
			leads(category) ?
				`${wording[category].superlative} on average ${acrossOf(category)}`
			:	`${ordinal(place)} of ${ranked} on average ${acrossOf(category)}`
	}
}

/**
 * A category's standing and ArkType's geometric mean in the graph's unit,
 * beside the next best's and by how much where ArkType is first, otherwise
 * beside the leader's, then the best named library's where the site doesn't
 * name that one
 */
const averagesOf = (category: CategoryId) => {
	const { standing, average, by } = standingOf(category)
	const { value, other, named } = average
	const { quantity, format } = unitBoards[category]
	const versus =
		other === named ?
			`${quantity(value)} against ${other.library}'s ${format(other.value)}${by && `, ${by} lower`}.`
		: by ? `${quantity(value)}, ${by} lower than the next best's.`
		: `${quantity(value)} against the best's ${format(other.value)}.`
	return `${standing}: ${versus}${other === named ? "" : ` The best of the other libraries with ${wellKnownRule} is ${named.library}, at ${format(named.value)}.`}`
}

/** the benchmarks the graphs average, by category */
const averagedSuites = (category: CategoryId) =>
	sourcesOf(unitBoards[category]).map(source => source.label)

/** the headline's suites whose code for each library we wrote: "valibot.dev's login form" */
const writtenSuites = list([
	...new Set(
		boardOrder.flatMap(category =>
			averagedSuites(category).filter(isWrittenByUs)
		)
	)
])

/** what the headline's standings average */
const rankedBy = `Ranked by geometric mean across other projects' public benchmarks${writtenSuites ? ` and ${writtenSuites}, which we wrote in each library from Valibot's code` : ""}`

/** how many of each category's public benchmarks are ours */
const ownedPerCategory = list(
	boardOrder.map(category => {
		const { suites } = fullLeaderboards[category]
		return `${suites.filter(isOwnSuite).length} of the ${suites.length} for ${wording[category].measures}`
	})
)

/** the board's rule, the same in every category: which results a graph averages and who it ranks */
const ruleNote =
	"Each category averages the largest set of results that ArkType, Zod and three more named libraries all ran, in the unit they measure, and ranks every library that ran all of them, in plain order."

/** which ArkType every row measures, the same in every category (oneBuild, below, holds it) */
const buildNote = "ArkType is its default precompiled build in all three."

/** the startup suites that time creating a schema, which a precompiled build does when it builds */
const creationOnly = [
	"schemabenchmarks.dev's initialization",
	"Sury's build and parse once"
]
const startupIsCreation = averagedSuites("startup").every(label =>
	creationOnly.includes(label)
)

/** how many startup results are our own benchmarks', which time whole apps */
const ownStartupResults =
	fullLeaderboards.startup.rows - independentRowsOf("startup").length

/** the benchmarks without which ArkType isn't first outright on a category's graph */
const leadDependsOn = (category: CategoryId) =>
	firstDependsOn(independentRowsOf(category), "ArkType")

/** the leads, "the startup lead" or "the validation speed and startup leads" */
const leadsOf = (categories: CategoryId[]) =>
	`the ${list(categories.map(category => wording[category].measures))} lead${categories.length > 1 ? "s" : ""}`

/** which leads hold with any one benchmark left out, and which benchmarks the others depend on */
const leadsWithoutEach = () => {
	const robust = led.filter(category => !leadDependsOn(category).length)
	const sentences = led
		.filter(category => leadDependsOn(category).length)
		.map(
			category =>
				`The ${wording[category].measures} lead doesn't survive leaving out ${leadDependsOn(category).length > 1 ? "any one of " : ""}${list(leadDependsOn(category))}.`
		)
	if (robust.length) {
		const holding = leadsOf(robust)
		sentences.unshift(
			`${holding[0].toUpperCase()}${holding.slice(1)} ${robust.length > 1 ? "hold" : "holds"} with any one benchmark left out.`
		)
	}
	return sentences.join(" ")
}

/** how many results each category's graph averages, for the headline's notes, and what startup's measure */
const independentResults = `${list(
	boardOrder.map(
		(category, i) =>
			`${unitBoards[category].rows.length}${i ? "" : " results"} for ${wording[category].measures}`
	)
)}${startupIsCreation ? `; the ${unitBoards.startup.rows.length} startup results time creating a schema` : ""}`

/**
 * Measured at febe60baf by a procedure registered before the run: a
 * generated app of 11, 92 and 1012 Types (copies of the startup benchmark's
 * SaaS schemas, each copy's bounds offset so no Type repeats, each Type called
 * by a request handler) built with and without the plugin on esbuild 0.25,
 * Vite 8 and Next 16 (Turbopack), on Node 25 under WSL2 with 16 cores, each
 * run started at a 1-minute load under 4. Medians of 7 cold builds per arm;
 * dev servers timed from spawn until headless Chromium ran every handler, 5
 * starts per arm, and edits from writing the shared module until the page
 * showed it, 30 per arm. No run failed or was dropped. `pnpm benchBuildTime`
 * reruns it (ark/repo/bench/buildTime), and `pnpm benchBuildTime summarize
 * febe60baf` rewrites buildTime.json from this run's rows there.
 */
const buildTimeOf = (cell: string): number => {
	const stats = (
		buildTime.cells as Record<string, { median: number } | undefined>
	)[cell]
	if (!stats) throw new Error(`buildTime.json has no ${cell}`)
	return stats.median
}

const durationText = (ms: number) =>
	ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`

// with the plugin, then without, e.g. "7.3 s rather than 414 ms"
const builtWith = (cell: (arm: string) => string) =>
	`${durationText(buildTimeOf(cell("on")))} rather than ${durationText(buildTimeOf(cell("off")))}`

const addedBy = (cell: (arm: string) => string) =>
	durationText(buildTimeOf(cell("on")) - buildTimeOf(cell("off")))

/**
 * Gzip bytes of synthetic apps of 10 or more Types, written alike in ArkType,
 * precompiled with the "smallest" preset, and Valibot, at three seeds and as
 * a graph of references, measured by `pnpm benchScale`
 * (ark/repo/bench/scale)
 */
const presetScaleRows = presetScale.series.flatMap(({ apps, seed, rows }) =>
	rows.map(row => ({
		...row,
		label: `${apps} seed ${seed} at ${row.types} Types`
	}))
)

const listOf = (items: string[]): string =>
	items.length < 3 ?
		items.join(" and ")
	:	`${items.slice(0, -1).join(", ")} and ${items.at(-1)}`

const scalesText = (types: number[]): string =>
	listOf(types.map(n => n.toLocaleString("en-US")))

const presetScaleTypes = [
	...new Set(presetScaleRows.map(row => row.types))
].sort((l, r) => l - r)

// each scale where "smallest" gzips below Valibot on every seed and series, and
// at the rest, how far its largest row is above Valibot's
const presetScaleWins = presetScaleTypes.filter(types =>
	presetScaleRows.every(
		row => row.types !== types || row.smallest < row.valibot
	)
)

const presetScaleLosses = presetScaleTypes.filter(
	types => !presetScaleWins.includes(types)
)

// rounded up to a tenth, so the claim never reads a smaller margin than a row's
const presetScaleExcess =
	Math.ceil(
		Math.max(
			0,
			...presetScaleRows
				.filter(row => presetScaleLosses.includes(row.types))
				.map(row => (row.smallest / row.valibot - 1) * 100)
		) * 10
	) / 10

// where a scale loses, it's where arktype's formats are stricter than Valibot's:
// with every RegExp stripped from both, "smallest" was the smaller at 50 Types
// (5247 to 5297 and 5190 to 5227 B gz at 5373f183d's seeds 1 and 2), and its
// patterns cost about 120 B more
const presetScaleText =
	!presetScaleTypes.length ?
		`Big frontend? The "smallest" preset gzips about what Valibot does.`
	: presetScaleLosses.length === 0 ?
		`Big frontend? The "smallest" preset gzips smaller than Valibot at every scale we measured, ${scalesText([presetScaleTypes[0]])} to ${scalesText([presetScaleTypes.at(-1)!])} Types.`
	: presetScaleWins.length === 0 ?
		`Big frontend? The "smallest" preset gzips within ${presetScaleExcess}% of Valibot at every scale we measured, ${scalesText([presetScaleTypes[0]])} to ${scalesText([presetScaleTypes.at(-1)!])} Types, as ArkType's stricter formats, like ISO 8601 dates and UUID versions, ship longer patterns.`
	:	`Big frontend? The "smallest" preset gzips smaller than Valibot at ${scalesText(presetScaleWins)} Types, and within ${presetScaleExcess}% at ${scalesText(presetScaleLosses)}, where ArkType's stricter formats, like ISO 8601 dates and UUID versions, ship longer patterns.`

/** a fraction as a percent, rounded down so it never reads larger than measured */
const percentText = (fraction: number) =>
	`${(Math.floor(fraction * 1000) / 10).toFixed(1)}%`

/** a ratio, rounded down: "1.56x" */
const timesText = (ratio: number) =>
	`${(Math.floor(ratio * 100) / 100).toFixed(2)}x`

const startupLibraries = [
	...new Set(startupApps.flatMap(app => Object.keys(startupWins[app])))
]

const fewestRounds = Math.min(
	...startupApps.flatMap(app => Object.values(startupWins[app]))
)

// the smallest margin over the best other library on any app: 15% on
// moltar, to Typia, at 20710020e
const startupThinnest = Math.min(
	...startupApps.map(app => {
		const { ArkType, ...others } = resultsOf("startup", app)
		return 1 - ArkType / Math.min(...Object.values(others))
	})
)

const startupAppsText =
	startsFirst ?
		`On each of the ${startupApps.length} apps in our startup benchmark, precompiled ArkType's default build ran fewer instructions from import through its first validation than every other library measured on it (${list(startupLibraries)}), by ${percentText(startupThinnest)} or more, in ${fewestRounds === startupRounds ? `all ${startupRounds}` : `at least ${fewestRounds} of ${startupRounds}`} paired runs on Node 24.`
	:	{
			pending:
				"On each app in our startup benchmark, precompiled ArkType's default build ran fewer instructions from import through its first validation than every other library measured on it."
		}

/**
 * Whole apps, from the bigapp board (lib/bench/scoreboard.ts): its generated
 * apps, which anyone can rebuild, and ntwine, stated only once its migration
 * has a public commit
 */
const hostNames: Record<Host, string> = {
	esbuild: "esbuild",
	webpack: "webpack",
	turbopack: "Next on Turbopack"
}

const appLibraryNames: Record<string, string> = {
	zod: "Zod 4",
	zodCompiled: "z.compile",
	zod3: "Zod 3",
	valibot: "Valibot",
	ajv: "ajv"
}

const buildNames: Record<Build, string> = {
	precompiled: "the default build",
	smallest: 'the "smallest" preset'
}

const appTypes = generatedRows.map(row => Number(row.app))

const appRivals = [...new Set(generatedRows.flatMap(rivalsOf))]

const everyAppRival = appRivals.filter(library =>
	generatedRows.every(row => library in row.arms)
)

const appScope = `On apps we generated of ${Math.min(...appTypes).toLocaleString("en-US")} to ${Math.max(...appTypes).toLocaleString("en-US")} Types, built with ${list([...new Set(generatedRows.map(row => hostNames[row.host]))])}`

const appRivalsText = `${list(everyAppRival.map(library => appLibraryNames[library]))} on every app${everyAppRival.length < appRivals.length ? `, ${list(appRivals.filter(library => !everyAppRival.includes(library)).map(library => appLibraryNames[library]))} on some` : ""}`

/** "11 and 46 Types through webpack with narrows" */
const appsText = (rows: AppRow[]) => {
	const groups = new Map<
		string,
		{ host: Host; variant: string; types: number[] }
	>()
	for (const key of new Set(rows.map(row => `${row.host} ${row.app}`))) {
		const of = rows.filter(row => `${row.host} ${row.app}` === key)
		const variant =
			of.length === 2 ? ", with and without narrows"
			: of[0].narrows ? " with narrows"
			: ""
		const group = groups.get(`${of[0].host}${variant}`) ?? {
			host: of[0].host,
			variant,
			types: []
		}
		group.types.push(Number(of[0].app))
		groups.set(`${of[0].host}${variant}`, group)
	}
	return list(
		[...groups.values()].map(
			({ host, variant, types }) =>
				`${list(types.map(n => n.toLocaleString("en-US")))} Types through ${hostNames[host]}${variant}`
		)
	)
}

const coverageText = ({ won, lost }: Sweep) =>
	lost.length ?
		`${won.length} of those ${won.length + lost.length} apps`
	:	"every one of those apps"

/** the thinnest margin a sweep won by among some of its apps */
const thinnestAmong = (sweep: Sweep, measure: Measure, rows: AppRow[]) =>
	Math.min(
		...sweep.won
			.filter(row => rows.includes(row))
			.map(row => marginOf(row, sweep.build, measure))
	)

const appSpeedSweep = sweepOf(generatedRows, "precompiled", "hot")

// nanoseconds per call on a shared machine, so read as ratios: at 19a959e8a
// the closest was z.compile at 92 Types with narrows, 1.68x
const appSpeedText = () =>
	`${appScope}, the default build validated faster on ${appSpeedSweep.lost.length ? `${appSpeedSweep.won.length} of ${generatedRows.length}` : "every one"} than every other library measured on it (${appRivalsText})${appSpeedSweep.lost.length ? `, though not on ${appsText(appSpeedSweep.lost)}` : ""}, by ${timesText(1 / (1 - appSpeedSweep.thinnest))} or more: nanoseconds per call over ${scoreboard.rounds} paired runs on a shared machine, p ≤ ${appSpeedSweep.p.toFixed(3)}.`

const appStartupSweep = bestSweepOf(generatedRows, "first")

const bundledRows = generatedRows.filter(row => row.host !== "turbopack")

const nextRows = generatedRows.filter(row => row.host === "turbopack")

// instructions, which load doesn't move; a Next route's count is mostly
// Next's own startup, about 552M of an empty route's
const appStartupText = () => {
	const { build, lost } = appStartupSweep
	const fastest = sweepOf(generatedRows, "precompiled", "first")
	return `From import through its first validation, ${buildNames[build]} ran fewer instructions than every other library on ${coverageText(appStartupSweep)}${lost.length ? `, not on ${appsText(lost)}` : ""}, by ${percentText(thinnestAmong(appStartupSweep, "first", bundledRows))} or more through ${list([...new Set(bundledRows.map(row => hostNames[row.host]))])}${nextRows.some(row => !lost.includes(row)) ? ` and by ${percentText(thinnestAmong(appStartupSweep, "first", nextRows))} or more on Turbopack, where Next's own startup is in every count` : ""}, p ≤ ${appStartupSweep.p.toFixed(3)}${build === "smallest" ? `; the default build did on ${fastest.won.length} of them` : ""}.`
}

const appSizeSweep = bestSweepOf(generatedRows, "gz")

// bytes are exact, so margins are in bytes: the thinnest win, and where the
// size build loses, the most the best other library ships less by
const appSizeText = () => {
	const { build, won, lost } = appSizeSweep
	const bytesBelow = (row: AppRow) =>
		row.arms[bestRivalOf(row, "gz")].gz - row.arms[build].gz
	const zodRatios = generatedRows.map(
		row => row.arms.zod.gz / row.arms[build].gz
	)
	const defaultRatios = generatedRows.map(
		row => row.arms.precompiled.gz / row.arms.smallest.gz
	)
	return `With ${buildNames[build]}, its bundle was smaller than every other library's on ${coverageText(appSizeSweep)}, by ${Math.min(...won.map(bytesBelow))} B or more${
		lost.length ?
			`; on ${appsText(lost)}, ${list([...new Set(lost.map(row => appLibraryNames[bestRivalOf(row, "gz")]))])}'s was smaller, by up to ${Math.max(...lost.map(row => -bytesBelow(row)))} B (${(Math.ceil(Math.max(...lost.map(row => -bytesBelow(row) / row.arms[build].gz)) * 1000) / 10).toFixed(1)}%)`
		:	""
	}. ${
		zodRatios.every(ratio => ratio > 1) ?
			`It shipped less than Zod 4 on every one, by ${timesText(Math.min(...zodRatios))} to ${timesText(Math.max(...zodRatios))}.`
		:	`It shipped less than Zod 4 on ${zodRatios.filter(ratio => ratio > 1).length} of ${zodRatios.length}.`
	}${build === "smallest" ? ` The default build, the fastest, shipped ${timesText(Math.min(...defaultRatios))} to ${timesText(Math.max(...defaultRatios))} what "smallest" did.` : ""}`
}

/** the generated apps' claims, pending with their draft unless the board has every arm of each */
const appClaim = (text: () => string, draft: string): Claim<string> =>
	generatedComplete ? text() : { pending: draft }

const ntwineBundled = ntwineRows.find(
	row =>
		row.host === "esbuild" &&
		row.arms.precompiled &&
		row.arms.zod &&
		row.arms.zod3
)

/** the precompiled build with less of a measure on an app */
const lowerBuildOf = (row: AppRow, measure: Measure): Build =>
	row.arms.smallest?.[measure] < row.arms.precompiled[measure] ?
		"smallest"
	:	"precompiled"

const kbText = (bytes: number) =>
	bytes < 100_000 ?
		`${(bytes / 1000).toFixed(1)} KB`
	:	`${Math.round(bytes / 1000)} KB`

const gigaText = (instructions: number) => `${(instructions / 1e9).toFixed(3)}G`

/** ntwine through the other hosts where Zod 4 ships less than either build: webpack tree-shakes Zod's namespace */
const ntwineZodSmaller = ntwineRows.filter(
	row =>
		row.host !== "esbuild" &&
		row.arms.zod &&
		row.arms[lowerBuildOf(row, "gz")].gz > row.arms.zod.gz
)

// Zod 3 is what ntwine ships; its source runs unchanged on Zod 4, the other arm
const bigAppText = (row: AppRow) => {
	const size = lowerBuildOf(row, "gz")
	const start = lowerBuildOf(row, "first")
	const hot = lowerBuildOf(row, "hot")
	const { zod, zod3 } = row.arms
	return `On ntwine's packages/shared, the schemas of an open-source app and the code that reads them, bundled with esbuild: ${buildNames[size]} shipped ${kbText(row.arms[size].gz)} gzipped to Zod 4's ${kbText(zod.gz)} and Zod 3's ${kbText(zod3.gz)}, the version ntwine ships; ${start === size ? "it" : buildNames[start]} ran ${gigaText(row.arms[start].first)} instructions through its first validation to Zod 4's ${gigaText(zod.first)} and Zod 3's ${gigaText(zod3.first)}; and ${buildNames[hot]} validated a thread ${timesText(zod.hot / row.arms[hot].hot)} as fast as Zod 4 and ${timesText(zod3.hot / row.arms[hot].hot)} as fast as Zod 3, in nanoseconds per call over ${scoreboard.rounds} paired runs on a shared machine, p ≤ ${Math.max(row.p[hot]!.zod.hot, row.p[hot]!.zod3.hot).toFixed(3)}.${ntwineZodSmaller.length ? ` Zod 4 ships less ${list(ntwineZodSmaller.map(other => `through ${hostNames[other.host]} (${kbText(other.arms.zod.gz)} to ${kbText(other.arms[lowerBuildOf(other, "gz")].gz)})`))}.` : ""}`
}

// plain arktype, without the plugin, against Zod 4, from import through the
// first validation on the apps bundled with esbuild, the only host with a plain
// arm. Deferred Types move it, so it renders only once it starts sooner on
// every app; at 19a959e8a it ran 1.5-2.2x Zod 4's instructions
const dynamicRows = [
	...generatedRows,
	...(scoreboard.ntwine.migration ? ntwineRows : [])
].filter(row => row.host === "esbuild" && row.arms.arktype && row.arms.zod)

const dynamicStartsFirst =
	dynamicRows.length > 0 &&
	dynamicRows.every(
		row =>
			row.arms.arktype.first < row.arms.zod.first &&
			(row.p.arktype?.zod.first ?? 1) < 0.05
	)

const dynamicInitText = () =>
	`Without the plugin, ArkType ran fewer instructions from import through its first validation than Zod 4 on every app we bundled with esbuild, ${dynamicRows.length} in all${dynamicRows.some(row => row.app === "ntwine") ? ", ntwine among them" : ""}, by ${percentText(Math.min(...dynamicRows.map(row => 1 - row.arms.arktype.first / row.arms.zod.first)))} or more, p ≤ ${Math.max(...dynamicRows.map(row => row.p.arktype!.zod.first)).toFixed(3)}.`

/** sentences, each rendered by `<Claim id="..." />` */
export const claims = {
	// each superlative names a category ArkType must claim (claimsLead), as
	// the check of the copy below holds. "Smallest" is the lowest geometric
	// mean of gzipped bytes over the public size results the size graph
	// averages: at 20710020e (results/newest/) the default build's 1.35 kB to
	// Typia's 1.52 over valibot.dev's login form and schemabenchmarks.dev's
	// download, 2nd on each of the two (ajv on the form, an unnamed library on
	// the download), 1st of the 12 libraries on both
	headline:
		claimsLead("size") ?
			"TypeScript's smallest, fastest validator."
		:	"TypeScript's fastest validator.",
	headlineNote: `${rankedBy}: ${independentResults}. ${ruleNote} ${buildNote} ${namingNote} A monthly job reruns the size benchmarks at each library's newest release.`,
	// the fastest and the smallest builds differ: on moltar's cases the default
	// build takes 13-46x fewer instructions per call than "smallest"
	// (smallestSpeed)
	buildChoice:
		"Build the fastest validator or the smallest from the same definitions.",
	// moltar's cases in instructions per call on Node 24 at 3f6c3c32b,
	// parseSafe / parseStrict / assertLoose / assertStrict: "smallest" 8605 /
	// 4451 / 3179 / 4402, Valibot 1.5.0 8299 / 9533 / 8218 / 9450, Zod 4.6.7
	// 1086 / 2171 / 2087 / 2101, the default build 217 / 337 / 69 / 332
	// (ark/repo/bench/external/README.md, "The smallest preset's speed")
	smallestSpeed:
		'In our runs of moltar\'s benchmark, counting instructions per call, "smallest" is 4% slower than Valibot on parseSafe and 2.1-2.6x faster on the other three cases, while Zod 4 is 1.5-7.9x faster than it and the default build 13-46x faster.',
	// the homepage's spec rows, each a fragment of a claim below
	dynamicSpec:
		"as fast as precompiled on valid data in our runs of schemabenchmarks.dev's benchmark",
	sizeSpec: whileSmallerThanValibot(
		"precompiled with its defaults, smaller than Valibot on its own login form, with the form's messages"
	),
	// the sentence under the docs' charts
	chartsSummary: whileSmallerThanValibot(
		"In our runs of moltar's benchmark, precompiled ArkType is the fastest on parseSafe and assertLoose. Precompiled with its defaults, it reports an error for every invalid field of Valibot's own login form, with the form's messages, in a smaller bundle than Valibot."
	),
	// the product schema, valid data: 5951.05 instructions each at 20710020e,
	// 10 reps (6005 vs 6003 at a306152ce); by wall clock at f29b8d153
	// (H3), dynamic took 0.999x the default build's time and stayed under 1.05x
	// in 24 of 30 passes (p 0.00072)
	dynamicSpeed:
		"In our runs of schemabenchmarks.dev's product schema, dynamic ArkType validates valid data as fast as precompiled ArkType.",
	// the default build in production against Valibot on leaderboard.json's
	// login form row, the size chart's two bars: 1026 vs 1564 B gz at 20710020e
	loginSize: whileSmallerThanValibot(
		`On Valibot's own login form, ArkType's default build reports an error for every invalid field, with the form's messages, in a smaller bundle than Valibot: ${loginKb("ArkType")} kB gzipped against ${loginKb("Valibot")} kB.`
	),
	// moltar strict, dynamic, 2.2.9 to now at 20710020e: assertStrict 3857-4013
	// -> 348, parseStrict 3835-4199 -> 367 instructions over two runs of 3 reps
	// (10.4x to 11.5x); by wall clock at f29b8d153 (H4), 0.074x
	// 2.2.9's time on assertStrict, under 0.2x in 30 of 30 passes
	strictSpeedup:
		"Dynamic ArkType validates moltar's strict cases about 10 times faster than 2.2.",
	// 16 instructions at 20710020e, the harness floor; typia createIs 381
	noInit:
		"A precompiled Type costs nothing to create: it was built when you built.",
	// `import { type } from "arktype"` by ark/repo/bench/bundle.ts's method
	// (esbuild 0.25.10 bundle + minify, esm, neutral, "production", gzip) at
	// 20710020e: 89783 vs 2.2.9's 47797 B gz from npm (271466 vs 156116 min);
	// 82983 at 5acd85130. sizeChart's dynamic bar, the login form at gzip
	// level 9, is 89767
	dynamicSize:
		"Dynamic ArkType is 89.8 kB gzipped, minified with esbuild, up from 47.8 kB in 2.2.9, so precompile to ship less.",
	zodSpec: `faster than Zod 4 in ${zodScenarios} we ran`,
	// the median, not the range: the largest ratio is a first-error row, and
	// Zod has no first-error mode
	zodSpeed: `Precompiled ArkType was faster than Zod 4 in ${zodScenarios} of our benchmark, by a median of ${medianOf(zod)}, and faster than Zod 4's z.compile in ${zodCompiled.wins} of ${zodCompiled.count}, by a median of ${medianOf(zodCompiled)}${zodCompiledLosses}.`,
	// the error rows from benchData.json
	speedScope: `It isn't the fastest at everything. On the rows that report errors for invalid data, ajv was faster on ${bench.ajvFasterCount} of ${bench.errorCount}.`,
	// a promise, not a rate: what makes it true is the skill's guide, which
	// the docs show beside the prompt and the command that installs it
	zodMigration:
		"Migrate from Zod with one prompt: your agent converts each schema where it is, then checks its work with your typecheck and tests.",
	// the hero's third superlative, after the headline's two: with them it
	// says ArkType leads every category, so the blog post's check below holds
	// each lead, and the one after oneBuild that one build holds them all
	pickThree:
		claimsLead("startup") ?
			"Quickest to start, too."
		:	{ pending: "Quickest to start, too." },
	// the blog post's answer to "pick 2", stated only while ArkType leads all
	// three, and draft otherwise
	pickThreeLine: leadsEvery ? "Pick 3." : { pending: "Pick 3." },
	// the homepage board's title: "Pick 3" only while ArkType leads every
	// category, otherwise a phrase per category it leads on average: runs
	// faster, starts lighter (instructions rather than time), ships less
	boardTitle:
		leadsEvery ?
			"Fast. Small. Quick to start. Pick 3."
		:	led.map(category => wording[category].phrase).join(" "),
	// what the board's superlatives average
	boardNote: `${rankedBy}: ${independentResults}. ${ruleNote} ${buildNote} ${namingNote}`,
	// startup.ts's apps, each library measured on it, from leaderboard.json's
	// startup rows and their paired rounds; pending unless every app beats
	// every library
	startupApps: startupAppsText,
	// the bigapp board's generated apps: hot path, startup and size, each
	// computed from lib/bench/scoreboard.json, so a rerun tightens or loosens
	// the wording with the data
	appSpeed: appClaim(
		appSpeedText,
		"On apps we generated of 11 to 1,012 Types, the default build validated faster than every other library measured on them."
	),
	appStartup: appClaim(
		appStartupText,
		"From import through its first validation, precompiled ArkType ran fewer instructions than every other library on every one of those apps."
	),
	appSize: appClaim(
		appSizeText,
		'With the "smallest" preset, its bundle was smaller than every other library\'s on every one of those apps.'
	),
	// ntwine, a real app: pending until the board measured its migration at
	// a public commit (ark/repo/bench/bigapp/ntwine.ts's migrationSha)
	bigApp:
		ntwineBundled && scoreboard.ntwine.migration ?
			bigAppText(ntwineBundled)
		:	{
				pending:
					ntwineBundled ?
						bigAppText(ntwineBundled)
					:	"On ntwine's packages/shared, the schemas of an open-source app and the code that reads them, precompiled ArkType ships less and starts sooner than Zod 4."
			},
	// dynamic startup against Zod 4 on the board's apps, pending until it
	// leads on every one; dynamic bytes are a disclosure (dynamicSize), never
	// a claim
	dynamicInit:
		dynamicStartsFirst ? dynamicInitText() : (
			{
				pending:
					"Without the plugin, ArkType ran fewer instructions from import through its first validation than Zod 4 on every app we bundled with esbuild."
			}
		),
	// speedChart and H1
	parseSafe:
		"On moltar's parseSafe benchmark, precompiled ArkType takes the fewest instructions per call, and by wall clock it was faster than each of the six libraries closest to it, Typia among them, in at least 28 of 30 paired runs.",
	// the blog post's answer to "pick 2", a line per category
	speedAverage: averagesOf("speed"),
	startupAverage: averagesOf("startup"),
	// the public startup results time creating a schema, which ArkType's
	// default build skips; our own time cold starts of whole apps, which
	// "Quickest to start" needs as well (startsFirst)
	startupBasis: `${startupIsCreation ? `Each of the ${unitBoards.startup.rows.length} independent startup results times creating a schema, which a precompiled build does when it builds. ` : ""}Our own startup benchmarks time importing an app through its first validation (${ownStartupResults} results).`,
	sizeAverage: averagesOf("size"),
	// the "smallest" preset for schema-heavy frontends, where the default
	// build's lead at form scale (sizeAverage) doesn't carry: gzip bytes from
	// lib/bench/presetScale.json, naming the scales it wins on every row and how
	// close the rest come
	sizePreset: presetScaleText,
	// benchSize, saas, whose one undiscriminated union is all that ships it: 5220 ->
	// 5777 B gz under "smallest", 10275 -> 10880 by default; erasing what it reads from
	// those bundles saves 492 and 556 B. login, moltar and shop hold none and don't
	// change for it
	unionListing:
		"The first union in a bundle that lists what its branches expected ships about 0.5 kB gzipped to write it, and a bundle with none ships nothing for it.",
	// which benchmarks are ours, and that the averages leave them out
	benchmarkOwners: `Every benchmark is public. We wrote ${ownedPerCategory}; the averages above leave those out.${writtenSuites ? ` They keep ${writtenSuites}, Valibot's code, which we wrote in each library and size with our own script.` : ""}`,
	// the claims that depend on a single benchmark, and which
	leaveOneOut: leadsWithoutEach(),
	// the rest from lib/bench/buildTime.json, measured as buildTimeOf says
	buildTimeApp: `We timed an app of ${buildTime.types.large} Types: ${buildTime.domains.large} copies of our startup benchmark's SaaS schemas, each Type validating a request in a handler. Each figure is a median, with the plugin rather than without it, on Node 25 with 16 cores.`,
	buildTimeProduction: `A cold production build took ${builtWith(arm => `build vite large ${arm} build`)} with Vite 8, ${builtWith(arm => `build esbuild large ${arm} build`)} with esbuild and ${builtWith(arm => `build next large ${arm} build`)} with Next 16 on Turbopack.`,
	buildTimeDev: `Vite's dev server loaded the app in a browser in ${builtWith(arm => `dev vite large ${arm} startup`)}, and the page showed an edit to the module every Type in its copy imports in ${builtWith(arm => `dev vite large ${arm} hmr`)}. Next's took ${builtWith(arm => `dev next large ${arm} startup`)} to load and ${builtWith(arm => `dev next large ${arm} hmr`)} to show the edit.`,
	buildTimeWatch: `esbuild's watch rebuild after that edit took ${builtWith(arm => `edit esbuild large development ${arm} rebuild`)}, and ${builtWith(arm => `edit esbuild large production ${arm} rebuild`)} for a production bundle, which reads the whole app again to leave out what no read needs.`,
	buildTimeMedium: `At ${buildTime.types.medium} Types, the plugin added ${addedBy(arm => `build vite medium ${arm} build`)} to Vite's production build, ${addedBy(arm => `build esbuild medium ${arm} build`)} to esbuild's and ${addedBy(arm => `build next medium ${arm} build`)} to Next's, and ${addedBy(arm => `dev vite medium ${arm} hmr`)} to an edit in Vite's dev server.`
} satisfies Record<string, Claim<string>>

export type ClaimId = keyof typeof claims

export const standingsAsOf = {
	date: measured,
	text: `Standings as of ${new Date(measured).toLocaleDateString("en-US", {
		timeZone: "UTC",
		year: "numeric",
		month: "long",
		day: "numeric"
	})}.`
}

export const headlineMethod = {
	label: "Method",
	href: "https://github.com/arktypeio/arktype/blob/main/ark/repo/bench/external/README.md#best-average"
}

const assertLeads = (category: CategoryId, by: string) => {
	if (category === "startup" && !startsFirst) {
		throw new Error(
			`${by} claims ArkType starts first, but our startup benchmark has a library it didn't start every app before: ${JSON.stringify(startupWins)}`
		)
	}
	if (!leads(category)) {
		const { standings, rows } = unitBoards[category]
		throw new Error(
			`${by} claims ArkType is best on ${category}, but it doesn't have the lowest geometric mean, shared with no one, over the ${rows.length} results its graph averages: ${JSON.stringify(standings.slice(0, 5))}`
		)
	}
}

/**
 * Throws if copy states a standing ArkType can't claim: naming a category's
 * superlative needs ArkType to claim it, and "Pick 3" needs all three
 */
export const assertStandings = (copy: string, by: string) => {
	for (const category of boardOrder) {
		if (new RegExp(`\\b${wording[category].superlative}\\b`, "i").test(copy))
			assertLeads(category, by)
	}
	if (/\bpick 3\b/i.test(copy))
		for (const category of boardOrder) assertLeads(category, by)
}

const typesText = (types: number) =>
	`${types.toLocaleString("en-US")} ${types === 1 ? "Type" : "Types"}`

const presetSizeAppNames: Record<string, string> = {
	login: "a login form",
	shop: "a shop"
}

export interface PresetSizeRow {
	label: string
	default: string
	smallest: string
	valibot: string
}

/**
 * The precompile docs' table of "smallest" against the default build and
 * Valibot: the homepage's login and shop apps, then the first mixed series
 * of presetScale.json
 */
export const presetSizeRows: PresetSizeRow[] = [
	...presetScale.apps.map(({ app, types, ...sizes }) => ({
		label: `${presetSizeAppNames[app]}, ${typesText(types)}`,
		...sizes
	})),
	...presetScale.series[0].rows.map(({ types, ...sizes }) => ({
		label: typesText(types),
		...sizes
	}))
].map(({ label, default: defaultSize, smallest, valibot }) => ({
	label,
	default: kbText(defaultSize),
	smallest: kbText(smallest),
	valibot: kbText(valibot)
}))

// the copy that states standings; the blog's frontmatter, which can't read
// claims, is checked as its social cards are written (lib/writeOgImages.ts)
const standingClaims = [
	"headline",
	"pickThree",
	"pickThreeLine",
	"boardTitle"
] as const satisfies ClaimId[]
for (const id of standingClaims) {
	const claim = claims[id]
	if (!isPending(claim)) assertStandings(claim, id)
}

/** the libraries the board compares against: with ArkType, the two that wrote Standard Schema */
const isRival = (bar: BenchmarkBar) => /^(Valibot|Zod)\b/.test(bar.name)

type CategoryBase = {
	label: string
	/** the options ArkType's numbers were built with */
	build: string
	/** ArkType's place on the category's graph: "1st" */
	place: string
	ranked: number
	standing: string
	/** whether ArkType is first outright */
	leads: boolean
	/** ArkType's geometric mean, the next best's or the leader's, and the best named library's */
	average: { value: number; other: UnitStanding; named: UnitStanding }
	/** how far ArkType's mean is below the next best's, where it leads: "15.0%" */
	by: string
	source: BenchmarkChart["source"]
}

/** a category measured once per library, drawn as bars */
export type BarCategory = CategoryBase & {
	id: "startup"
	bars: BenchmarkBar[]
	unit: string
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

/** a category drawn as its geometric means, ArkType's among them */
export type StandingCategory = CategoryBase & {
	id: "size"
	/** the named leaders, at least five and through one past ArkType */
	standings: UnitStanding[]
	/** whether a library the site doesn't name ranks among them */
	omits: boolean
}

export type Category = BarCategory | SpreadCategory | StandingCategory

/** ArkType, Zod and Valibot, the best named library by average and the closest named one on the chart */
const onBoard = (chart: BenchmarkChart, runnerUp: string) => {
	const named = chart.bars.filter(
		bar => bar.kind === "precompiled" || isWellKnown(bar.name)
	)
	const closest = named.find(bar => bar.kind !== "precompiled")
	return named.filter(
		bar =>
			bar.kind === "precompiled" ||
			isRival(bar) ||
			bar.name === runnerUp ||
			bar === closest
	)
}

/** the size card's named leaders, at least five and through one past ArkType */
const sizeStandings = unitBoards.size.standings.filter(s =>
	isWellKnown(s.library)
)
const shownSize = sizeStandings.slice(
	0,
	Math.max(5, sizeStandings.findIndex(s => s.library === "ArkType") + 2)
)

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
		source: { label: "the benchmark below", href: "#run" }
	},
	{
		id: "startup",
		label: "cold start",
		build: "default build",
		...standingOf("startup"),
		bars: onBoard(startupChart, averageOf("startup").named.library),
		unit: "million instructions",
		format: n => `${n}M`,
		margin: "less startup work than",
		source: startupChart.source
	},
	{
		id: "size",
		label: "bundle size",
		build: "default build",
		...standingOf("size"),
		standings: shownSize,
		omits:
			unitBoards.size.standings.indexOf(shownSize.at(-1)!) >= shownSize.length,
		source: headlineMethod
	}
]

/** whether one build holds every category, as "Pick 3" implies without saying */
const oneBuild = new Set(categories.map(c => c.build)).size === 1

// the blog post's assert above already holds every category's lead
if (!isPending(claims.pickThree) && !oneBuild) {
	throw new Error(
		`The hero claims one build leads every category, but the board's categories come from ${list([...new Set(categories.map(c => c.build))])}`
	)
}

const escapeRegex = (text: string) =>
	text.replace(/[$()*+./?[\\\]^{|}]/g, "\\$&")

const suiteLabels = boardOrder.flatMap(
	category => fullLeaderboards[category].suites
)

/** Throws if copy names a library the site may not, one under wellKnownDownloads */
export const assertNamesWellKnown = (copy: string, by: string) => {
	const prose = suiteLabels.reduce(
		(text, label) => text.replaceAll(label, ""),
		copy
	)
	const named = unnamed.filter(library =>
		new RegExp(`(?<![\\w@/-])${escapeRegex(library)}(?![\\w/-])`, "i").test(
			prose
		)
	)
	if (named.length) {
		throw new Error(
			`${by} names ${list(named)}, which the site may not: each has under ${wellKnownDownloads} npm downloads a week`
		)
	}
}

for (const [id, claim] of Object.entries(claims))
	assertNamesWellKnown(draftOf<string>(claim), id)

// the names the board shows
for (const library of categories.flatMap(category => [
	category.average.named.library,
	...(category.id === "speed" ? category.versus.map(v => v.name)
	: category.id === "startup" ?
		category.bars.filter(bar => bar.kind !== "precompiled").map(bar => bar.name)
	:	category.standings.map(s => s.library))
])) {
	if (!isWellKnown(library)) {
		throw new Error(
			`The homepage names ${library}, which has under ${wellKnownDownloads} npm downloads a week`
		)
	}
}
