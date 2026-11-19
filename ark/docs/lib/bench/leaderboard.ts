/**
 * The published results of every benchmark the site reads
 * (leaderboard.json): each suite's rows, who wrote it, when it last ran and
 * which libraries the site may name. The site ranks by lib/bench/units.ts's
 * rule over the independent suites' rows.
 *
 * It also still computes the pooled standings ark/repo/bench/external's
 * standings.ts checks itself against, by the README's "Best average": a row's
 * results as ratios to its best, a library's suite score the geometric mean
 * over the suite's rows it's on, its category score the geometric mean over
 * its suite scores, counted with at least half a suite's rows and ranked with
 * at least half a category's suites. Nothing on the site states a place from
 * them.
 */
import data from "./leaderboard.json" with { type: "json" }

export type CategoryId = "speed" | "startup" | "size"

type Suite = {
	category: string
	id: string
	label: string
	rows: { id: string; results: Record<string, number> }[]
	/** startup.ts's rounds, each running every arm in turn, and by app, in how many ArkType ran fewer instructions than each library */
	paired?: { rounds: number; wins: Record<string, Record<string, number>> }
	/** the login form's bytes for ArkType's builds that no row ranks */
	builds?: FormBuilds
	/** when its published results were measured, if they're read from result files */
	measured?: SuiteMeasured
}

export type SuiteMeasured = {
	/** the day the other libraries' newest results were measured, as YYYY-MM-DD */
	rivals: string
	/** the commit ArkType's rows were measured at */
	arkType: string
}

export type FormBuilds = {
	/** `type()` with no build step */
	dynamic: number
	/** precompiled with the "smallest" preset */
	smallest: number
}

const suites = data.suites as Suite[]

export type Standing = {
	library: string
	/** geometric mean of its suite scores: 1 is best on every row */
	score: number
	suites: number
}

export type Leaderboard = {
	category: CategoryId
	suites: string[]
	/** rows across its suites */
	rows: number
	standings: Standing[]
}

export const geomean = (values: readonly number[]) =>
	Math.exp(values.reduce((sum, v) => sum + Math.log(v), 0) / values.length)

const suiteScores = (suite: Suite) => {
	const ratios: Record<string, number[]> = {}
	for (const { results } of suite.rows) {
		const best = Math.min(...Object.values(results))
		for (const [library, value] of Object.entries(results))
			(ratios[library] ??= []).push(value / best)
	}
	return Object.fromEntries(
		Object.entries(ratios)
			.filter(([, r]) => r.length * 2 >= suite.rows.length)
			.map(([library, r]) => [library, geomean(r)])
	)
}

/** the suites we wrote, by id */
const ownSuites = ["homepage", "startup", "homepageStartup", "homepageSize"]

/**
 * The independent suites whose code for each library we wrote: valibot.dev's
 * login form, Valibot's code there, written by us in every other library and
 * sized by our script
 */
const writtenByUs = ["form"]

const labelsOf = (ids: string[]) =>
	ids.map(id => {
		const suite = suites.find(s => s.id === id)
		if (!suite) throw new Error(`No leaderboard suite has the id ${id}`)
		return suite.label
	})

const ownLabels = labelsOf(ownSuites)

const writtenLabels = labelsOf(writtenByUs)

/** whether we wrote a suite, by its label */
export const isOwnSuite = (label: string) => ownLabels.includes(label)

/** whether we wrote a suite's code for each library, by its label */
export const isWrittenByUs = (label: string) => writtenLabels.includes(label)

/**
 * The headline's basis: every suite but the ones we designed, so ArkType's own
 * benchmarks don't decide its claims. It keeps valibot.dev's login form, whose
 * code is Valibot's though we wrote it in each library. It applies to every
 * category alike.
 */
const independentSuites = (suite: Suite) => !ownSuites.includes(suite.id)

const leaderboardOf = (
	category: CategoryId,
	counts: (suite: Suite) => boolean
): Leaderboard => {
	const counted = suites.filter(s => s.category === category && counts(s))
	const scored = counted.map(suiteScores)
	const libraries = new Set(scored.flatMap(Object.keys))
	const standings = [...libraries]
		.map(library => {
			const scores = scored.flatMap(s => (library in s ? [s[library]] : []))
			return { library, score: geomean(scores), suites: scores.length }
		})
		.filter(s => s.suites * 2 >= counted.length)
		.sort((l, r) => l.score - r.score)
	return {
		category,
		suites: counted.map(s => s.label),
		rows: counted.reduce((sum, s) => sum + s.rows.length, 0),
		standings
	}
}

const leaderboardsOf = (counts: (suite: Suite) => boolean) =>
	({
		speed: leaderboardOf("speed", counts),
		startup: leaderboardOf("startup", counts),
		size: leaderboardOf("size", counts)
	}) satisfies Record<CategoryId, Leaderboard>

/** when the published rows were last measured, as YYYY-MM-DD */
export const measured: string = data.measured

/** every suite of a category, ours included: its benchmarks, how many results they have and the pooled standings over them */
export const fullLeaderboards = leaderboardsOf(() => true)

/** a suite's row: each library's result, in the suite's unit */
export const resultsOf = (suiteId: string, rowId: string) =>
	suites.find(s => s.id === suiteId)!.rows.find(row => row.id === rowId)!
		.results

export type ResultRow = { id: string; results: Record<string, number> }

/** every row of a suite, by the suite's id */
export const rowsOfSuite = (suiteId: string): ResultRow[] => {
	const suite = suites.find(s => s.id === suiteId)
	if (!suite) throw new Error(`No leaderboard suite has the id ${suiteId}`)
	return suite.rows
}

export type SuiteRow = ResultRow & {
	/** the suite it is a row of, by label: "schemabenchmarks.dev" */
	suite: string
}

/** every row of a category's independent suites, each with its suite's label */
export const independentRowsOf = (category: CategoryId): SuiteRow[] =>
	suites
		.filter(s => s.category === category && independentSuites(s))
		.flatMap(s => s.rows.map(row => ({ ...row, suite: s.label })))

/** valibot.dev's login form as ArkType's other builds bundle it, gzipped */
export const formBuilds: FormBuilds = (() => {
	const builds = suites.find(s => s.id === "form")?.builds
	if (!builds) {
		throw new Error(
			"leaderboard.json's form suite has no builds: rerun ark/repo/bench/external/leaderboard.ts"
		)
	}
	return builds
})()

/** when a suite's published results were measured, by the suite's label */
export const measuredOf = (label: string): SuiteMeasured => {
	const measured = suites.find(s => s.label === label)?.measured
	if (!measured) {
		throw new Error(
			`leaderboard.json doesn't say when ${label} was measured: rerun ark/repo/bench/external/leaderboard.ts`
		)
	}
	return measured
}

/** startup.ts's paired rounds, if its results recorded them */
export const startupPaired = suites.find(s => s.id === "startup")?.paired

/** a two-sided sign test's p for one side winning `wins` of `rounds` pairs */
export const pairedP = (wins: number, rounds: number) => {
	let tail = 0
	let choose = 1
	for (let k = 0; k <= Math.min(wins, rounds - wins); k++) {
		tail += choose
		choose = (choose * (rounds - k)) / (k + 1)
	}
	return Math.min(1, (2 * tail) / 2 ** rounds)
}

/** the weekly npm downloads a library needs for the site to name it: Typia, the least-downloaded validator most readers know, has 211k, and the most-downloaded niche one, pure-parse, 45k */
export const wellKnownDownloads = 100_000

/** wellKnownDownloads as the site states it */
export const wellKnownRule = `${wellKnownDownloads / 1000}k+ npm downloads a week`

const weekly: Record<string, number> = data.downloads.weekly

/** whether the site may name a library; every standing still counts every library */
export const isWellKnown = (library: string) => {
	if (!(library in weekly)) {
		throw new Error(
			`${library} has no npm downloads in leaderboard.json: add its package to ark/repo/bench/external/downloads.ts and rerun it`
		)
	}
	return weekly[library] >= wellKnownDownloads
}

/** every library on a row that the site may not name */
export const unnamed = [
	...new Set(
		suites.flatMap(s => s.rows.flatMap(row => Object.keys(row.results)))
	)
].filter(library => !isWellKnown(library))
