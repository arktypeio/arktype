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
	versusLibrary,
	type LibraryVersus
} from "./bench/bench.ts"
import {
	fullLeaderboards,
	isOwnSuite,
	isWrittenByUs,
	leaderboards,
	leadDependsOn,
	leads,
	resultsOf,
	rowsOf,
	sizeTie,
	ties,
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
 * the sizes (login-5acd85130.json) and the pre-registered wall-clock run at
 * f29b8d153 (wall-f29b8d153.md: 30 paired passes, Holm over H1-H4), where all
 * four hypotheses held. At the release candidate (wall.md) H1 had failed. Each
 * claim is scoped: precompiled or dynamic, valid or invalid data, with or
 * without errors. The headline's superlatives and the board's standings
 * instead follow the README's "Best average" rule over the independent suites
 * (lib/bench/leaderboard.ts), with ArkType as its default production build
 * throughout, each of its rows measured at 90d510484.
 */

// moltar's typescript-runtime-type-benchmarks, perf instruction counts in
// benny's call shape, the default build. By wall clock (H1, p 8.7e-7), it
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
		{ name: "ArkType (precompiled)", kind: "precompiled", value: 184 },
		{ name: "@ts-runtypes", kind: "other", value: 209 },
		{ name: "Typia", kind: "other", value: 213 },
		{ name: "ArkType (dynamic)", kind: "dynamic", value: 216 },
		{ name: "ata-validator (AOT)", kind: "other", value: 220 }
	]
}

// bundlejs-style esbuild of valibot.dev's login form as written, every entry
// reporting an error for every invalid field with the form's messages (a blank
// password gets ArkType's one, where Valibot also says it's empty), in a
// production build (esbuild's "production" condition), which prunes a
// precompiled validator to what the form uses. Every bar is from results/login-5acd85130.json: the default build
// is 2494 / 1140 B min / gz, the "smallest" preset 1037. forms/, the size
// suite in the README's "Best average", bundles the same form with the same
// settings, but exporting a function that asserts rather than asserting once,
// so its default build is 1158. The chart's earlier 1313 was "smallest" at
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
		{ name: "ArkType (precompiled)", kind: "precompiled", value: 1140 },
		{ name: "Valibot", kind: "other", value: 1547 },
		{ name: "Zod Mini", kind: "other", value: 5127 },
		{ name: "Zod", kind: "other", value: 25058 },
		{ name: "ArkType (dynamic)", kind: "dynamic", value: 82946 }
	]
}

// the homepage's login app as request handlers read it, bundled with
// bench/bundle.ts's esbuild settings in a production build: perf's user-space
// instructions from just before a fresh process imports the bundle to just
// after its first validation of valid data, less a bundle that validates
// nothing (ark/repo/bench/external/startup.ts). Planned before any count: 20
// rounds, a two-sided sign test per library paired by round. Node 24 medians
// at 90d510484 (results/startup-90d510484-node24.json): the default build had
// the fewest against all seven in 20 of 20 (p 1.9e-6), as it had in 19-20 of
// 20 on Node 24 and 25 at 4fd880692. On valibot.dev's login form it was 1.04M
// to Valibot's 2.37M, on shop 10.47M to Valibot's 12.26M, 20 of 20, and on the
// moltar app 1.05M to Typia's 1.16M, 19 of 20. No wall-clock run yet, so
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

/** how the board words each category: its superlative, its title phrase and what its rows measure */
const wording = {
	speed: {
		superlative: "Fastest",
		comparative: "faster",
		phrase: "Runs faster.",
		measures: "validation speed"
	},
	startup: {
		superlative: "Quickest to start",
		comparative: "quicker to start",
		phrase: "Starts lighter.",
		measures: "startup"
	},
	size: {
		superlative: "Smallest",
		comparative: "smaller",
		phrase: "Ships less.",
		measures: "bundle size"
	}
} satisfies Record<CategoryId, Record<string, string>>

const boardOrder = ["speed", "startup", "size"] as const satisfies CategoryId[]

/** the categories ArkType may claim, the only ones the board states a win in */
const led = boardOrder.filter(leads)

/** whether ArkType may claim every category the board shows, the only time it may say "Pick 3" */
export const leadsEvery = led.length === boardOrder.length

/** ArkType's best average, and the next best where ArkType leads, otherwise the leader */
const averageOf = (category: CategoryId) => {
	const { place, score } = placeOf(category)
	return { score, other: leaderboards[category].standings[place === 1 ? 1 : 0] }
}

/** how far above the best size average ArkType's may be and still tie it: "5%" */
export const tieMargin = `${Math.round(sizeTie * 100)}%`

/** where ArkType's best average places it in a category, a superlative only where it may claim one */
const standingOf = (category: CategoryId) => {
	const { suites } = leaderboards[category]
	const written = suites.filter(isWrittenByUs)
	const across =
		written.length ?
			`across ${suites.length - written.length} independent benchmarks and ${listOf(written)}`
		:	`across ${suites.length} independent benchmarks`
	const { place, ranked } = placeOf(category)
	const [first] = leaderboards[category].standings
	return {
		leads: leads(category),
		ties: ties(category),
		place: ordinal(place),
		ranked,
		average: averageOf(category),
		standing:
			ties(category) ?
				`Tied for ${wording[category].superlative.toLowerCase()} on average ${across}, within ${tieMargin} of ${first.library}`
			: leads(category) ?
				`${wording[category].superlative} on average ${across}`
			:	`${ordinal(place)} of ${ranked} on average ${across}`
	}
}

const listOf = (items: string[]) =>
	items.length < 2 ?
		items.join("")
	:	`${items.slice(0, -1).join(", ")} and ${items.at(-1)}`

/** a category's standing and best average, beside the next best's where ArkType leads, otherwise beside the leader's */
const averagesOf = (category: CategoryId) => {
	const { score, other } = averageOf(category)
	return `${standingOf(category).standing}: ${score.toFixed(2)} against ${other.library}'s ${other.score.toFixed(2)}.`
}

/** the headline's suites whose code for each library we wrote: "valibot.dev's login form" */
const writtenSuites = listOf([
	...new Set(
		boardOrder.flatMap(category =>
			leaderboards[category].suites.filter(isWrittenByUs)
		)
	)
])

/** what the headline's standings average */
const rankedBy = `Ranked by best average across other projects' public benchmarks${writtenSuites ? ` and ${writtenSuites}, which we wrote in each library from Valibot's code` : ""}`

/** how many of each category's benchmarks on the full board are ours */
const ownedPerCategory = listOf(
	boardOrder.map(category => {
		const { suites } = fullLeaderboards[category]
		return `${suites.filter(isOwnSuite).length} of the ${suites.length} for ${wording[category].measures}`
	})
)

/** ArkType's place on a board: "1st" */
const placeOn = ({ standings }: { standings: Standing[] }) =>
	ordinal(standings.findIndex(s => s.library === "ArkType") + 1)

/** ArkType's place in each category on the full board, beside the leader where it isn't first */
const fullBoardPlaces = listOf(
	boardOrder.map(category => {
		const { standings } = fullLeaderboards[category]
		const i = standings.findIndex(s => s.library === "ArkType")
		const [first] = standings
		return i === 0 ?
				`1st for ${wording[category].measures}`
			:	`${ordinal(i + 1)} of ${standings.length} for ${wording[category].measures}, ${standings[i].score.toFixed(2)} to ${first.library}'s ${first.score.toFixed(2)}`
	})
)

/** where ArkType places on the full board, stated wherever the headline's standings are */
const fullBoardNote = `With our own benchmarks added, ArkType is ${fullBoardPlaces}.`

/** the full board's leaders where they aren't ArkType: "ajv averages smaller" */
const fullBoardLeaders = boardOrder.flatMap(category => {
	const [first] = fullLeaderboards[category].standings
	return first.library === "ArkType" ?
			[]
		:	[`${first.library} averages ${wording[category].comparative}`]
})

/** how the standings treat noise and stay current, after the notes on them */
const methodNote = `Sizes within ${tieMargin} of the best average count as a tie, since one release can move a bundle by about that much. A weekly job reruns the size benchmarks at each library's newest release.`

/** the startup suites that time creating a schema, which a precompiled build does when it builds */
const creationOnly = [
	"schemabenchmarks.dev's initialization",
	"Sury's build and parse once"
]
const startupIsCreation = leaderboards.startup.suites.every(label =>
	creationOnly.includes(label)
)

/** a claim's kind: "lead", or "tie" where another library has the best average */
const claimOf = (category: CategoryId) => (ties(category) ? "tie" : "lead")

/** the claims, "the startup lead" or "the speed and startup leads and the size tie" */
const claimsOf = (categories: CategoryId[]) =>
	listOf(
		(["lead", "tie"] as const).flatMap(kind => {
			const of = categories.filter(category => claimOf(category) === kind)
			return of.length ?
					[
						`the ${listOf(of.map(category => wording[category].measures))} ${kind}${of.length > 1 ? "s" : ""}`
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
				`The ${wording[category].measures} ${claimOf(category)} doesn't survive leaving out any one of ${listOf(leadDependsOn(category))}.`
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
	return `${count} of the ${of}${largest[library] < largest.ArkType ? ", including the largest bundle we measured" : ""}`
}

const sizeRival = averageOf("size").other

/** how far below the next best's ArkType's size average is, where it leads */
const sizeLead = 1 - placeOf("size").score / sizeRival.score

/** each category's results on the independent suites, for the headline's notes, and what startup's measure */
const independentResults = `${listOf(
	boardOrder.map(
		(category, i) =>
			`${leaderboards[category].rows}${i ? "" : " results"} for ${wording[category].measures}`
	)
)}${startupIsCreation ? `; the ${leaderboards.startup.rows} for startup time creating a schema` : ""}`

/** sentences, each rendered by `<Claim id="..." />` */
export const claims = {
	// each superlative names a category ArkType must claim
	// (lib/bench/leaderboard.ts), as the check of the copy below holds. Size
	// is the close one: ArkType 1.252 to Typia's 1.256 since the size rows of
	// results/newest/, and sizeTie keeps the claim within 5% of the best
	headline:
		leads("size") ?
			"TypeScript's smallest, fastest validator."
		:	"TypeScript's fastest validator.",
	// the headline's basis in one line, under it in the blog post
	headlineBasis: `${rankedBy}.${fullBoardLeaders.length ? ` With our own benchmarks added, ${listOf(fullBoardLeaders)}.` : ""}`,
	headlineNote: `${rankedBy}, each result a ratio to the best: ${independentResults}. ${fullBoardNote} ${methodNote}`,
	// the fastest and the smallest builds differ: optimize "size" makes the
	// product schema's valid data 2.2x slower
	buildChoice:
		"Build the fastest validator or the smallest from the same definitions.",
	// the homepage's spec rows, each a fragment of a claim below
	dynamicSpec:
		"as fast as precompiled on valid data in our runs of schemabenchmarks.dev's benchmark",
	sizeSpec:
		"precompiled with its defaults, smaller than Valibot on its own login form, with the form's messages",
	// the sentence under the docs' charts
	chartsSummary:
		"In our runs of moltar's benchmark, precompiled ArkType is the fastest on parseSafe and assertLoose. Precompiled with its defaults, it reports an error for every invalid field of Valibot's own login form, with the form's messages, in a smaller bundle than Valibot.",
	// the product schema, valid data: 6005 vs 6003 instructions; by wall clock
	// (H3), dynamic took 0.999x the default build's time and stayed under 1.05x
	// in 24 of 30 passes (p 0.00072)
	dynamicSpeed:
		"In our runs of schemabenchmarks.dev's product schema, dynamic ArkType validates valid data as fast as precompiled ArkType.",
	// the default build in production, 1140 vs 1547 B gz, the form as written
	loginSize:
		"On Valibot's own login form, ArkType's default build reports an error for every invalid field, with the form's messages, in a smaller bundle than Valibot: 1.14 kB gzipped against 1.55 kB.",
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
	// (esbuild 0.25.10 bundle + minify, esm, neutral, "production", gzip) at
	// 5acd85130: 82983 vs 2.2.9's 47797 B gz from npm (260519 vs 156116 min);
	// sizeChart's dynamic bar, the login form, is 82946
	dynamicSize:
		"Dynamic ArkType is 83.0 kB gzipped, minified with esbuild, up from 47.8 kB in 2.2.9, so precompile to ship less.",
	zodSpec: `faster than Zod 4 in ${zodScenarios} we ran`,
	// the median, not the range: the largest ratio is a first-error row, and
	// Zod has no first-error mode
	zodSpeed: `Precompiled ArkType was faster than Zod 4 in ${zodScenarios} of our benchmark, by a median of ${medianOf(zod)}, and faster than Zod 4's z.compile in ${zodCompiled.wins} of ${zodCompiled.count}, by a median of ${medianOf(zodCompiled)}${zodCompiledLosses}.`,
	// the error rows from benchData.json
	speedScope: `It isn't the fastest at everything. On the rows that report errors for invalid data, ajv was faster on ${bench.ajvFasterCount} of ${bench.errorCount}.`,
	// no rate: 4 of 10 can't headline a row
	zodMigrationSpec: "a guide your agent follows from one prompt",
	// h2 in the Zod-migration eval: 10 repos chosen by a rule fixed before any
	// run (stars, 3-30 files importing zod), one Sonnet run each with the skill
	// at fc054f29f, graded on typecheck, tests, zod removed, differential parity
	// and no new casts. 4/10, 95% CI 0.12-0.74; 2 of the failures keep Zod for
	// MCP SDK v1. The rule counted a project without a test script as passing
	// its tests, and all four successes were such projects
	zodMigration:
		"With the skill, one prompt fully migrated 4 of 10 open-source Zod projects we picked by stars before running it: typecheck passes, Zod is removed, generated inputs get the same results and no casts were added. None of the four had a test script to run.",
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
	boardNote: `${rankedBy}, each result a ratio to the best: ${independentResults}. ${fullBoardNote} ${methodNote}`,
	// startupChart; the form is 1.04M vs Valibot's 2.37M, 20 of 20
	startupLogin:
		"On the homepage's login app, precompiled ArkType spends fewer instructions from import to its first validation than ajv, Valibot, Typia, Zod Mini, Zod, compiled Zod or TypeBox, in all 20 paired runs on Node 24.",
	// speedChart and H1
	parseSafe:
		"On moltar's parseSafe benchmark, precompiled ArkType takes the fewest instructions per call, and by wall clock it was faster than each of the six libraries closest to it, Typia among them, in at least 28 of 30 paired runs.",
	// the blog post's answer to "pick 2", a line per category
	speedAverage: averagesOf("speed"),
	startupAverage: averagesOf("startup"),
	// the independent startup rows time creating a schema, which ArkType's
	// default build skips; the full board adds our cold starts of whole apps
	startupBasis: `${startupIsCreation ? `Each of the ${leaderboards.startup.rows} independent startup results times creating a schema, which a precompiled build does when it builds. ` : ""}Our own startup benchmarks time importing an app through its first validation (${fullLeaderboards.startup.rows - leaderboards.startup.rows} results), and with them ArkType is ${placeOn(fullLeaderboards.startup)} for startup.`,
	sizeAverage: averagesOf("size"),
	// ArkType 1.252 to Typia's 1.256, Typia on 2 of the 3 suites; at
	// 808927feb's rows Typia had it, 1.256 to 1.297
	sizeClose:
		ties("size") ?
			`Size is the close one: ${sizeRival.library} has the best average, ${sizeRival.score.toFixed(2)} to ArkType's ${placeOf("size").score.toFixed(2)}, within the ${tieMargin} we count as a tie, and ships less than the default build on ${sizeResultsBeating(sizeRival.library)}.`
		: leads("size") ?
			`Size is the close one: ArkType's average is ${(sizeLead * 100).toFixed(1)}% below ${sizeRival.library}'s${sizeLead < sizeTie ? `, inside the ${tieMargin} we count as a tie,` : ""} and ${sizeRival.library} ships less than the default build on ${sizeResultsBeating(sizeRival.library)}.`
		:	`Size is the close one: ${sizeRival.library} has the best average, ${sizeRival.score.toFixed(2)} to ArkType's ${placeOf("size").score.toFixed(2)}, and ships less than the default build on ${sizeResultsBeating(sizeRival.library)}.`,
	// which benchmarks are ours, and that the averages leave them out
	benchmarkOwners: `Every benchmark is public. We wrote ${ownedPerCategory} on the full board; the averages above leave those out.${writtenSuites ? ` They keep ${writtenSuites}, Valibot's code, which we wrote in each library and size with our own script.` : ""}`,
	// the claims that depend on a single benchmark, and which
	leaveOneOut: leadsWithoutEach()
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
			`${by} claims ArkType is best on ${category}, but ${leaderboards[category].standings[0].library} has the best average${category === "size" ? `, and ArkType's is more than ${tieMargin} above it` : ""}: ${JSON.stringify(leaderboards[category].standings.slice(0, 5))}`
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
	/** what it measures */
	label: string
	/** the options ArkType's numbers were built with */
	build: string
	/** ArkType's place by best average: "1st" */
	place: string
	/** how many libraries the category ranks */
	ranked: number
	/** where ArkType's best average places it */
	standing: string
	/** whether ArkType has the best average or, for size, one tied for it, checked on the board */
	leads: boolean
	/** whether that's a tie, another library having the best average */
	ties: boolean
	/** ArkType's best average, and the library the card names beside it */
	average: { score: number; other: Standing }
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
	/** the leaders, at least five and through one past ArkType */
	standings: Standing[]
}

export type Category = BarCategory | SpreadCategory | StandingCategory

/** ArkType, Zod and Valibot, the library with the next best average and the closest on the chart */
const onBoard = (chart: BenchmarkChart, runnerUp: string) => {
	const closest = chart.bars.find(bar => bar.kind !== "precompiled")
	return chart.bars.filter(
		bar =>
			bar.kind === "precompiled" ||
			isRival(bar) ||
			bar.name === runnerUp ||
			bar === closest
	)
}

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
		bars: onBoard(startupChart, leaderboards.startup.standings[1].library),
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
		standings: leaderboards.size.standings.slice(
			0,
			Math.max(5, placeOf("size").place + 1)
		),
		source: headlineMethod
	}
]

/** whether one build holds every category, as "Pick 3" implies without saying */
export const oneBuild = new Set(categories.map(c => c.build)).size === 1

// the blog post's assert above already holds every category's lead
if (!isPending(claims.pickThree) && !oneBuild) {
	throw new Error(
		`The hero claims one build leads every category, but the board's categories come from ${listOf([...new Set(categories.map(c => c.build))])}`
	)
}
