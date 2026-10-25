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

for (const id of [...ownSuites, ...writtenByUs]) {
	if (!(data.suites as Suite[]).some(s => s.id === id))
		throw new Error(`No leaderboard suite has the id ${id}`)
}

/** whether we wrote a suite, by its label */
export const isOwnSuite = (label: string) =>
	ownSuites.some(
		id => (data.suites as Suite[]).find(s => s.id === id)!.label === label
	)

/** whether we wrote a suite's code for each library, by its label */
export const isWrittenByUs = (label: string) =>
	writtenByUs.some(
		id => (data.suites as Suite[]).find(s => s.id === id)!.label === label
	)

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
	const suites = (data.suites as Suite[]).filter(
		s => s.category === category && counts(s) && s.label !== without
	)
	const scored = suites.map(suiteScores)
	const libraries = new Set(scored.flatMap(Object.keys))
	const standings = [...libraries]
		.map(library => {
			const scores = scored.flatMap(s => (library in s ? [s[library]] : []))
			return { library, score: geomean(scores), suites: scores.length }
		})
		.filter(s => s.suites * 2 >= suites.length)
		.sort((l, r) => l.score - r.score)
	return {
		category,
		suites: suites.map(s => s.label),
		rows: suites.reduce((sum, s) => sum + s.rows.length, 0),
		standings
	}
}

const leaderboardsOf = (counts: (suite: Suite) => boolean) =>
	({
		speed: leaderboardOf("speed", counts),
		startup: leaderboardOf("startup", counts),
		size: leaderboardOf("size", counts)
	}) satisfies Record<CategoryId, Leaderboard>

/** the standings the headline and the board state, over independent suites */
export const leaderboards = leaderboardsOf(independentSuites)

/** every suite, ours included, published beside the headline's standings */
export const fullLeaderboards = leaderboardsOf(() => true)

/** a suite's row: each library's result, in the suite's unit */
export const resultsOf = (suiteId: string, rowId: string) =>
	(data.suites as Suite[])
		.find(s => s.id === suiteId)!
		.rows.find(row => row.id === rowId)!.results

/** each row's results across a category's independent suites */
export const rowsOf = (category: CategoryId) =>
	(data.suites as Suite[])
		.filter(s => s.category === category && independentSuites(s))
		.flatMap(s => s.rows.map(row => row.results))

/**
 * How far above the best size average ArkType's may be and still count as
 * tied for the smallest: one release can move a bundle's size by about this
 * much. Speed and startup need the best average.
 */
export const sizeTie = 0.05

/** whether ArkType may claim a board's category: it has the best average, or for size one within sizeTie of it */
const claimsBest = ({ category, standings }: Leaderboard) => {
	const ours = standings.find(s => s.library === "ArkType")
	if (!ours) return false
	return (
		ours === standings[0] ||
		(category === "size" && ours.score <= standings[0].score * (1 + sizeTie))
	)
}

/** whether ArkType may claim a category: the best average, or a size average tied for it */
export const leads = (category: CategoryId) =>
	claimsBest(leaderboards[category])

/** whether ArkType's claim to a category is a tie, another library having the best average */
export const ties = (category: CategoryId) =>
	leads(category) && leaderboards[category].standings[0].library !== "ArkType"

/** the suites without which ArkType couldn't claim a category */
export const leadDependsOn = (category: CategoryId) =>
	leaderboards[category].suites.filter(
		label => !claimsBest(leaderboardOf(category, independentSuites, label))
	)
