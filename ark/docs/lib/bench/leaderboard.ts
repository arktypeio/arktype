/**
 * Each category's best average across the public benchmarks in
 * leaderboard.json, by the rule in ark/repo/bench/external/README.md's "Best
 * average": a row's results as ratios to its best, a library's suite score
 * the geometric mean over the suite's rows it's on, its category score the
 * geometric mean over its suite scores. It counts a suite only with at least
 * half that suite's rows, and is ranked only with at least half the
 * category's suites.
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

const leaderboardOf = (category: CategoryId): Leaderboard => {
	const suites = (data.suites as Suite[]).filter(s => s.category === category)
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

export const leaderboards = {
	speed: leaderboardOf("speed"),
	startup: leaderboardOf("startup"),
	size: leaderboardOf("size")
} satisfies Record<CategoryId, Leaderboard>

/** whether ArkType has the best average in a category */
export const leads = (category: CategoryId) =>
	leaderboards[category].standings[0]?.library === "ArkType"
