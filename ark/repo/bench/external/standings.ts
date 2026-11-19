// prints each category's standings from ark/docs/lib/bench/leaderboard.json by
// the rule the site's headline and board follow, which is
// ark/docs/lib/bench/units.ts's and is run from there: over the independent
// suites, each library's geometric mean, in the unit measured, across the
// largest set of results that ArkType, Zod and three more named libraries all
// ran, every library that ran all of them placed in plain order. Named suites
// are left out, so a standing can be read with and without one.
// node standings.ts [suite id to leave out,...]
// With LEADERBOARD_FRESH, the leaderboard reproduce.ts or monthly.ts wrote
// there is ranked instead. Which libraries the site names always comes from
// the published leaderboard's downloads.
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
	isOwnSuite,
	type CategoryId,
	type SuiteRow
} from "../../../docs/lib/bench/leaderboard.ts"
import {
	averagedRows,
	sourcesOf,
	unitBoardOver
} from "../../../docs/lib/bench/units.ts"

type Suite = {
	category: string
	id: string
	label: string
	rows: { id: string; results: Record<string, number> }[]
}

const fresh = process.env.LEADERBOARD_FRESH
const data: { suites: Suite[] } = JSON.parse(
	readFileSync(
		fresh ?
			join(fresh, "leaderboard.json")
		:	join(import.meta.dirname, "../../../docs/lib/bench/leaderboard.json"),
		"utf8"
	)
)
const without = process.argv[2]?.split(",") ?? []

const rowsOf = (category: CategoryId): SuiteRow[] =>
	data.suites
		.filter(
			suite =>
				suite.category === category &&
				!isOwnSuite(suite.label) &&
				!without.includes(suite.id)
		)
		.flatMap(suite => suite.rows.map(row => ({ ...row, suite: suite.label })))

for (const category of ["speed", "startup", "size"] as const) {
	const rows = rowsOf(category)
	if (!averagedRows(rows).length) {
		console.log(
			`${category}: no result has ArkType, Zod and three more named libraries on it`
		)
		continue
	}
	const board = unitBoardOver(category, rows)
	const sources = sourcesOf(board)
		.map(source => `${source.label} ${source.results}`)
		.join(", ")
	// monthlyReport.ts reads these lines: a category's opens with its id and a
	// parenthesis, a standing is "  place. library: mean"
	console.log(
		`${category} (${board.unit}; geometric mean of ${board.rows.length} of ${rows.length} results: ${sources})`
	)
	for (const { place, library, value } of board.standings)
		console.log(`  ${place}. ${library}: ${board.format(value)}`)
}
