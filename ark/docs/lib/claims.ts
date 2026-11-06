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
	fullLeaderboards,
	isOwnSuite,
	isFirst,
	isWellKnown,
	isWrittenByUs,
	leaderboards,
	leadDependsOn,
	leads,
	measured,
	resultsOf,
	rowsOf,
	tieBand,
	ties,
	unnamed,
	wellKnownDownloads,
	wellKnownRule,
	type CategoryId,
	type Standing
} from "./bench/leaderboard.ts"
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
 * instead follow the README's "Best average" rule over the independent suites
 * (lib/bench/leaderboard.ts), with ArkType as its default production build
 * throughout, every one of its rows measured at 20710020e.
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

// bundlejs-style esbuild of valibot.dev's login form as written, every entry
// reporting an error for every invalid field with the form's messages (a blank
// password gets ArkType's one, where Valibot also says it's empty), in a
// production build (esbuild's "production" condition), which prunes a
// precompiled validator to what the form uses. Every bar is from
// results/login-20710020e.json: the default build
// is 2110 / 1007 B min / gz, the "smallest" preset 978 (at 5acd85130, 1140
// and 1037). forms/, the size suite in the README's "Best average", bundles
// the same form with the same settings, but exporting a function that asserts
// rather than asserting once, so its default build is 1026
// (results/newest/forms.json). The chart's earlier 1313 was "smallest" at
// 89510709d, before builds pruned by usage. Zod Mini's form is valibot.dev's
// code as written, which throws at its first parse on zod 4.6.7 (z.check
// takes no schema); written to run (z.email(...).check(...)), it is 5107.
export const sizeChart: BenchmarkChart = {
	title: "Bundle size",
	detail:
		"the login form as valibot.dev writes it, with its messages, bundled by us with bundlejs's esbuild settings; each reports an error for every invalid field. ArkType is precompiled with its default options in a production build. Zod Mini's form, as valibot.dev writes it, throws at its first parse; written so it runs, it is the same size within 20 B",
	unit: "bytes gzipped",
	source: {
		label: "the form from valibot.dev's comparison",
		href: "https://valibot.dev/guides/comparison/"
	},
	axisMax: 26_000,
	bars: [
		{ name: "ArkType (precompiled)", kind: "precompiled", value: 1007 },
		{ name: "Valibot", kind: "other", value: 1547 },
		{ name: "Zod Mini", kind: "other", value: 5127 },
		{ name: "Zod", kind: "other", value: 25058 },
		{ name: "ArkType (dynamic)", kind: "dynamic", value: 89751 }
	]
}

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

const placeOf = (category: CategoryId, boards = leaderboards) => {
	const { standings } = boards[category]
	const i = standings.findIndex(s => s.library === "ArkType")
	return { place: i + 1, ranked: standings.length, ...standings[i] }
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

/** the categories ArkType may claim, the only ones the board states a win in */
const led = boardOrder.filter(leads)

/** whether ArkType may claim every category the board shows, the only time it may say "Pick 3" */
export const leadsEvery = led.length === boardOrder.length

/**
 * ArkType's best average, the next best's where ArkType leads, otherwise the
 * leader's, and the best of the other libraries the site may name
 */
const averageOf = (category: CategoryId) => {
	const { place, score } = placeOf(category)
	const { standings } = leaderboards[category]
	return {
		score,
		other: standings[place === 1 ? 1 : 0],
		named: standings.find(
			s => s.library !== "ArkType" && isWellKnown(s.library)
		)!
	}
}

const nameOr = (library: string, otherwise: string) =>
	isWellKnown(library) ? library : otherwise

const namingNote = `We name only libraries with ${wellKnownRule}; every place, average and tie counts all of them.`

export const tieMargin = `${Math.round(tieBand * 100)}%`

export const averageText = (score: number) => score.toFixed(3)

const leadText = (score: number, next: number) => {
	const percent = (1 - score / next) * 100
	return percent < 0.1 ? "less than 0.1%" : `${percent.toFixed(1)}%`
}

/** where ArkType's best average places it in a category, a superlative only where it may claim one */
const standingOf = (category: CategoryId) => {
	const { suites } = leaderboards[category]
	const written = suites.filter(isWrittenByUs)
	const across =
		written.length ?
			`across ${suites.length - written.length} independent benchmarks and ${list(written)}`
		:	`across ${suites.length} independent benchmarks`
	const { place, ranked } = placeOf(category)
	const [first] = leaderboards[category].standings
	const average = averageOf(category)
	const by = place === 1 ? leadText(average.score, average.other.score) : ""
	return {
		leads: leads(category),
		ties: ties(category),
		place: leads(category) ? "1st" : ordinal(place),
		ranked,
		average,
		by,
		standing:
			ties(category) ?
				`${wording[category].superlative} on average ${across}, within ${tieMargin} of ${nameOr(first.library, "the best")}`
			: leads(category) ?
				`${wording[category].superlative} on average ${across}`
			:	`${ordinal(place)} of ${ranked} on average ${across}`
	}
}

/**
 * A category's standing and best average, beside the next best's and by how
 * much where ArkType leads, otherwise beside the leader's, then the best named
 * library's where the site doesn't name that one
 */
const averagesOf = (category: CategoryId) => {
	const { standing, average, by } = standingOf(category)
	const { score, other, named } = average
	const versus =
		other === named ?
			`${averageText(score)} against ${other.library}'s ${averageText(other.score)}${by && `, ${by} lower`}.`
		: by ? `${averageText(score)}, ${by} lower than the next best's.`
		: `${averageText(score)} against the best's ${averageText(other.score)}.`
	return `${standing}: ${versus}${other === named ? "" : ` The best of the other libraries with ${wellKnownRule} is ${named.library}, at ${averageText(named.score)}.`}`
}

/** the headline's suites whose code for each library we wrote: "valibot.dev's login form" */
const writtenSuites = list([
	...new Set(
		boardOrder.flatMap(category =>
			leaderboards[category].suites.filter(isWrittenByUs)
		)
	)
])

/** what the headline's standings average */
const rankedBy = `Ranked by best average across other projects' public benchmarks${writtenSuites ? ` and ${writtenSuites}, which we wrote in each library from Valibot's code` : ""}`

/** how many of each category's benchmarks on the full board are ours */
const ownedPerCategory = list(
	boardOrder.map(category => {
		const { suites } = fullLeaderboards[category]
		return `${suites.filter(isOwnSuite).length} of the ${suites.length} for ${wording[category].measures}`
	})
)

/** ArkType's place in each category on the full board, beside the leader where it isn't first */
const fullBoardPlaces = list(
	boardOrder.map(category => {
		const { place, ranked, score } = placeOf(category, fullLeaderboards)
		const [first] = fullLeaderboards[category].standings
		return place === 1 ?
				`1st for ${wording[category].measures}`
			:	`${ordinal(place)} of ${ranked} for ${wording[category].measures}, ${averageText(score)} to ${nameOr(first.library, "the best")}'s ${averageText(first.score)}`
	})
)

/** where ArkType places on the full board, stated wherever the headline's standings are */
const fullBoardNote = `With our own benchmarks added, ArkType is ${fullBoardPlaces}.`

/** how the standings treat noise, the same in every category */
const methodNote = `In every category, an average within ${tieMargin} of the best counts as first, since one release can move a result by about that much.`

/** the startup suites that time creating a schema, which a precompiled build does when it builds */
const creationOnly = [
	"schemabenchmarks.dev's initialization",
	"Sury's build and parse once"
]
const startupIsCreation = leaderboards.startup.suites.every(label =>
	creationOnly.includes(label)
)

const claimOf = (category: CategoryId) => (ties(category) ? "tie" : "lead")

/** the claims, "the startup lead" or "the speed and startup leads and the size tie" */
const claimsOf = (categories: CategoryId[]) =>
	list(
		(["lead", "tie"] as const).flatMap(kind => {
			const of = categories.filter(category => claimOf(category) === kind)
			return of.length ?
					[
						`the ${list(of.map(category => wording[category].measures))} ${kind}${of.length > 1 ? "s" : ""}`
					]
				:	[]
		})
	)

/** which claims hold with any one benchmark left out, and which suites the others depend on */
const leadsWithoutEach = () => {
	const robust = led.filter(category => !leadDependsOn(category).length)
	const sentences = led
		.filter(category => leadDependsOn(category).length)
		.map(
			category =>
				`The ${wording[category].measures} ${claimOf(category)} doesn't survive leaving out ${leadDependsOn(category).length > 1 ? "any one of " : ""}${list(leadDependsOn(category))}.`
		)
	if (robust.length) {
		const claims = claimsOf(robust)
		sentences.unshift(
			`${claims[0].toUpperCase()}${claims.slice(1)} ${robust.length > 1 ? "hold" : "holds"} with any one benchmark left out.`
		)
	}
	return sentences.join(" ")
}

/** the size results a library ships less than ArkType on, of those it's in, including the largest bundle ArkType ships if it's one */
const sizeResultsBeating = (library: string) => {
	const rows = rowsOf("size").filter(results => library in results)
	const largest = rows.reduce((l, r) => (r.ArkType > l.ArkType ? r : l))
	const count = rows.filter(
		results => results[library] < results.ArkType
	).length
	const of =
		rows.length === rowsOf("size").length ?
			`${rows.length} size results`
		:	`${rows.length} size results it's in`
	return `${count || "none"} of the ${of}${largest[library] < largest.ArkType ? ", including the largest of ArkType's bundles among them" : ""}`
}

const sizeRival = averageOf("size").other

const sizeRivalName = nameOr(
	sizeRival.library,
	leads("size") && !ties("size") ? "the next best" : "another library"
)

/** the startup chart's rivals, each on the login row of the run it cites: "ajv, Valibot, Zod Mini, Zod, Zod (compiled) and TypeBox" */
const startupRivals = list(
	startupChart.bars
		.filter(bar => bar.kind !== "precompiled")
		.map(bar => bar.name)
)

/** each category's results on the independent suites, for the headline's notes, and what startup's measure */
const independentResults = `${list(
	boardOrder.map(
		(category, i) =>
			`${leaderboards[category].rows}${i ? "" : " results"} for ${wording[category].measures}`
	)
)}${startupIsCreation ? `; the ${leaderboards.startup.rows} startup results time creating a schema` : ""}`

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

const presetScaleTypes = presetScaleRows.map(row => row.types)

/** whether "smallest" gzips below Valibot on every row, which sizePreset needs */
const presetScaleBacked =
	presetScaleRows.length > 0 &&
	presetScaleRows.every(row => row.smallest < row.valibot)

const presetScaleText = `Big frontend? The "smallest" preset gzips smaller than Valibot at every scale we measured, ${Math.min(...presetScaleTypes)} to ${Math.max(...presetScaleTypes).toLocaleString("en-US")} Types.`

/** sentences, each rendered by `<Claim id="..." />` */
export const claims = {
	// each superlative names a category ArkType must claim
	// (lib/bench/leaderboard.ts), as the check of the copy below holds. Size
	// is the close one: ArkType 1.163 to Typia's 1.256 on results/newest/'s
	// size rows (20710020e), and tieBand keeps the claim within 5% of the best
	headline:
		leads("size") ?
			"TypeScript's smallest, fastest validator."
		:	"TypeScript's fastest validator.",
	headlineNote: `${rankedBy}, each result a ratio to the best: ${independentResults}. ${fullBoardNote} ${methodNote} ${namingNote} A weekly job reruns the size benchmarks at each library's newest release.`,
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
	sizeSpec:
		"precompiled with its defaults, smaller than Valibot on its own login form, with the form's messages",
	// the sentence under the docs' charts
	chartsSummary:
		"In our runs of moltar's benchmark, precompiled ArkType is the fastest on parseSafe and assertLoose. Precompiled with its defaults, it reports an error for every invalid field of Valibot's own login form, with the form's messages, in a smaller bundle than Valibot.",
	// the product schema, valid data: 5951.05 instructions each at 20710020e,
	// 10 reps (6005 vs 6003 at a306152ce); by wall clock at f29b8d153
	// (H3), dynamic took 0.999x the default build's time and stayed under 1.05x
	// in 24 of 30 passes (p 0.00072)
	dynamicSpeed:
		"In our runs of schemabenchmarks.dev's product schema, dynamic ArkType validates valid data as fast as precompiled ArkType.",
	// the default build in production, 1007 vs 1547 B gz, the form as written
	loginSize:
		"On Valibot's own login form, ArkType's default build reports an error for every invalid field, with the form's messages, in a smaller bundle than Valibot: 1.01 kB gzipped against 1.55 kB.",
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
	// level 9, is 89751
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
	pickThree: "Quickest to start, too.",
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
	boardNote: `${rankedBy}, each result a ratio to the best: ${independentResults}. ${fullBoardNote} ${methodNote} ${namingNote}`,
	// startupChart's rivals, every one on the login row of the run it cites,
	// 20 of 20 each; the form is 0.88M vs Valibot's 2.34M, 20 of 20
	startupLogin: `On the homepage's login app, precompiled ArkType spends fewer instructions from import to its first validation than each of ${startupRivals}, in all 20 paired runs on Node 24.`,
	// speedChart and H1
	parseSafe:
		"On moltar's parseSafe benchmark, precompiled ArkType takes the fewest instructions per call, and by wall clock it was faster than each of the six libraries closest to it, Typia among them, in at least 28 of 30 paired runs.",
	// the blog post's answer to "pick 2", a line per category
	speedAverage: averagesOf("speed"),
	startupAverage: averagesOf("startup"),
	// the independent startup rows time creating a schema, which ArkType's
	// default build skips; the full board adds our cold starts of whole apps
	startupBasis: `${startupIsCreation ? `Each of the ${leaderboards.startup.rows} independent startup results times creating a schema, which a precompiled build does when it builds. ` : ""}Our own startup benchmarks time importing an app through its first validation (${fullLeaderboards.startup.rows - leaderboards.startup.rows} results), and with them ArkType is ${ordinal(placeOf("startup", fullLeaderboards).place)} for startup.`,
	sizeAverage: averagesOf("size"),
	// ArkType 1.163 to Typia's 1.256 at 20710020e, Typia on 2 of the 3
	// suites; at 2c1a6a86e's rows 1.176, at 624a5d716's ArkType led by 1.3%,
	// and at 808927feb's Typia had it,
	// 1.256 to 1.297. The blog states it right after sizeAverage, which has
	// the averages and the margin, so this adds only the results themselves
	sizeClose: `Size is the close one: ${sizeRivalName} ships less than the default build on ${sizeResultsBeating(sizeRival.library)}.`,
	// the "smallest" preset for schema-heavy frontends, where the default
	// build's lead at form scale (sizeAverage) doesn't carry: gzip bytes from
	// lib/bench/presetScale.json, pending wherever a row has it at or above
	// Valibot, so the home page and the blog leave it out
	sizePreset:
		presetScaleBacked ? presetScaleText : { pending: presetScaleText },
	// benchSize, saas, whose one undiscriminated union is all that ships it: 5220 ->
	// 5777 B gz under "smallest", 10275 -> 10880 by default; erasing what it reads from
	// those bundles saves 492 and 556 B. login, moltar and shop hold none and don't
	// change for it
	unionListing:
		"The first union in a bundle that lists what its branches expected ships about 0.5 kB gzipped to write it, and a bundle with none ships nothing for it.",
	// which benchmarks are ours, and that the averages leave them out
	benchmarkOwners: `Every benchmark is public. We wrote ${ownedPerCategory} on the full board; the averages above leave those out.${writtenSuites ? ` They keep ${writtenSuites}, Valibot's code, which we wrote in each library and size with our own script.` : ""}`,
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
	if (!leads(category)) {
		throw new Error(
			`${by} claims ArkType is best on ${category}, but ${leaderboards[category].standings[0].library} has the best average, and ArkType's is more than ${tieMargin} above it: ${JSON.stringify(leaderboards[category].standings.slice(0, 5))}`
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

const kbText = (bytes: number) =>
	bytes < 100_000 ?
		`${(bytes / 1000).toFixed(1)} KB`
	:	`${Math.round(bytes / 1000)} KB`

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
	/** "1st" wherever ArkType counts as first */
	place: string
	ranked: number
	standing: string
	leads: boolean
	ties: boolean
	/** ArkType's best average, the next best's or the leader's, and the best named library's */
	average: { score: number; other: Standing; named: Standing }
	/** how far ArkType's average is below the next best's, where it leads: "15.0%" */
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

/** a category drawn as its best averages, ArkType's among them */
export type StandingCategory = CategoryBase & {
	id: "size"
	/** the named leaders, at least five and through one past ArkType */
	standings: Standing[]
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
const sizeStandings = leaderboards.size.standings.filter(s =>
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
			leaderboards.size.standings.indexOf(shownSize.at(-1)!) >=
			shownSize.length,
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

export type PickThreeRow = {
	library: string
	/** null where it isn't ranked */
	cells: Record<CategoryId, { score: number; first: boolean } | null>
}

const rowOf = (library: string): PickThreeRow => ({
	library,
	cells: Object.fromEntries(
		boardOrder.map(category => {
			const board = leaderboards[category]
			const standing = board.standings.find(s => s.library === library)
			return [
				category,
				standing ?
					{ score: standing.score, first: isFirst(board, library) }
				:	null
			]
		})
	) as PickThreeRow["cells"]
})

/** every ranked library first in all three categories */
const firstInAll = [
	...new Set(
		boardOrder.flatMap(c => leaderboards[c].standings.map(s => s.library))
	)
].filter(library =>
	boardOrder.every(category => isFirst(leaderboards[category], library))
)

/**
 * The homepage's Pick 3 table: ArkType, every named library first in a
 * category or best of the others named in one, then Valibot and Zod, the two
 * that wrote Standard Schema with it
 */
export const pickThreeTable: {
	title: Claim<string>
	shown: string
	/** beside the startup column, what its rows time */
	startupNote: string
	categories: { id: CategoryId; label: string }[]
	rows: PickThreeRow[]
} = {
	title:
		leadsEvery && firstInAll.length === 1 ?
			"Only ArkType is first in all three."
		:	{ pending: "Only ArkType is first in all three." },
	shown: `Libraries with ${wellKnownRule} shown, every library counted.`,
	// the startup rows time creating a schema (startupBasis), so the column
	// is the general advantage of building ahead of time, not like for like
	startupNote:
		startupIsCreation ?
			"Startup counts creating a schema: done at build by precompiled validators, at load by the rest."
		:	"",
	categories: boardOrder.map(category => ({
		id: category,
		label: wording[category].measures
	})),
	rows: [
		...new Set([
			"ArkType",
			...boardOrder.flatMap(category => {
				const board = leaderboards[category]
				return [
					...board.standings.filter(s => isFirst(board, s.library)),
					averageOf(category).named
				]
					.map(s => s.library)
					.filter(isWellKnown)
			}),
			"Valibot",
			"Zod"
		])
	].map(rowOf)
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
	assertNamesWellKnown(draftOf(claim), id)
assertNamesWellKnown(draftOf(pickThreeTable.title), "pickThreeTable")

// the names the board and the Pick 3 table show
for (const library of [
	...categories.flatMap(category => [
		category.average.named.library,
		...(category.id === "speed" ? category.versus.map(v => v.name)
		: category.id === "startup" ?
			category.bars
				.filter(bar => bar.kind !== "precompiled")
				.map(bar => bar.name)
		:	category.standings.map(s => s.library))
	]),
	...pickThreeTable.rows.map(row => row.library)
]) {
	if (!isWellKnown(library)) {
		throw new Error(
			`The homepage names ${library}, which has under ${wellKnownDownloads} npm downloads a week`
		)
	}
}
