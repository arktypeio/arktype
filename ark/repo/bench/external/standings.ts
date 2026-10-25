// prints each category's standings from ark/docs/lib/bench/leaderboard.json by
// the "Best average" rule, over every suite or only those named, so the
// average can be read with and without a suite. The math is
// ark/docs/lib/bench/leaderboard.ts's, which it matches over every suite
// node standings.ts [suite id,...]
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { fullLeaderboards } from "../../../docs/lib/bench/leaderboard.ts"

type Suite = {
	category: string
	id: string
	rows: { id: string; results: Record<string, number> }[]
}

// with LEADERBOARD_FRESH, the leaderboard reproduce.ts wrote there
const fresh = process.env.LEADERBOARD_FRESH
const data: { suites: Suite[] } = JSON.parse(
	readFileSync(
		fresh ?
			join(fresh, "leaderboard.json")
		:	join(import.meta.dirname, "../../../docs/lib/bench/leaderboard.json"),
		"utf8"
	)
)
const only = process.argv[2]?.split(",")

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

for (const category of ["speed", "startup", "size"] as const) {
	const suites = data.suites.filter(
		s => s.category === category && (!only || only.includes(s.id))
	)
	const scored = suites.map(suiteScores)
	const standings = [...new Set(scored.flatMap(Object.keys))]
		.map(library => {
			const scores = scored.flatMap(s => (library in s ? [s[library]] : []))
			return { library, score: geomean(scores), suites: scores.length }
		})
		.filter(s => s.suites * 2 >= suites.length)
		.sort((l, r) => l.score - r.score)
	if (!only && !fresh) {
		const docs = fullLeaderboards[category].standings
		if (JSON.stringify(docs) !== JSON.stringify(standings))
			throw new Error(`${category} differs from lib/bench/leaderboard.ts`)
	}
	console.log(
		`${category} (${suites.map(s => s.id).join(", ")}; ${suites.reduce((n, s) => n + s.rows.length, 0)} rows)`
	)
	for (const [i, s] of standings.entries()) {
		const partial =
			s.suites < suites.length ? ` [${s.suites}/${suites.length} suites]` : ""
		console.log(`  ${i + 1}. ${s.library} ${s.score.toFixed(3)}${partial}`)
	}
	// each suite's own scores, for where a library gains or loses
	for (const [i, suite] of suites.entries()) {
		console.log(
			`    ${suite.id} (${suite.rows.length}): ${Object.entries(scored[i])
				.sort(([, l], [, r]) => l - r)
				.map(([library, score]) => `${library} ${score.toFixed(3)}`)
				.join(", ")}`
		)
	}
}
