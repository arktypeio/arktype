/**
 * Each category's best average across the public benchmarks in
 * leaderboard.json, by the rule in ark/repo/bench/external/README.md's "Best
 * average": a row's results as ratios to its best, a library's suite score
 * the geometric mean over the suite's rows it's on, its category score the
 * geometric mean over its suite scores. It counts a suite only with at least
 * half that suite's rows, and is ranked only with at least half the
 * category's suites. The headline's standings average the independent
 * suites; the full board, every suite, is published beside them.
 */
import data from "./leaderboard.json" with { type: "json" }

export type CategoryId = "speed" | "startup" | "size"

type Suite = {
	category: string
	id: string
	label: string
	rows: { id: string; results: Record<string, number> }[]
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

const geomean = (values: readonly number[]) =>
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
	counts: (suite: Suite) => boolean,
	without?: string
): Leaderboard => {
	const counted = suites.filter(
		s => s.category === category && counts(s) && s.label !== without
	)
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

/** the standings the headline and the board state, over independent suites */
export const leaderboards = leaderboardsOf(independentSuites)

/** every suite, ours included, published beside the headline's standings */
export const fullLeaderboards = leaderboardsOf(() => true)

/** a suite's row: each library's result, in the suite's unit */
export const resultsOf = (suiteId: string, rowId: string) =>
	suites.find(s => s.id === suiteId)!.rows.find(row => row.id === rowId)!
		.results

/** a suite's rows' results, none if it isn't on the board */
export const suiteRowsOf = (suiteId: string) =>
	suites.find(s => s.id === suiteId)?.rows.map(row => row.results) ?? []

/** each row's results across a category's independent suites */
export const rowsOf = (category: CategoryId) =>
	suites
		.filter(s => s.category === category && independentSuites(s))
		.flatMap(s => s.rows.map(row => row.results))

/**
 * How far above a category's best average a library's may be and still count
 * as first, in every category alike: one release can move a result by about
 * this much
 */
export const tieBand = 0.05

/** whether a library counts as first on a board: the best average, or one within tieBand of it */
export const isFirst = ({ standings }: Leaderboard, library: string) => {
	const standing = standings.find(s => s.library === library)
	return !!standing && standing.score <= standings[0].score * (1 + tieBand)
}

/** whether ArkType counts as first in a category */
export const leads = (category: CategoryId) =>
	isFirst(leaderboards[category], "ArkType")

/** whether ArkType is first by the band, another library having the best average */
export const ties = (category: CategoryId) =>
	leads(category) && leaderboards[category].standings[0].library !== "ArkType"

/** the suites without which ArkType wouldn't count as first in a category */
export const leadDependsOn = (category: CategoryId) =>
	leaderboards[category].suites.filter(
		label =>
			!isFirst(leaderboardOf(category, independentSuites, label), "ArkType")
	)

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
