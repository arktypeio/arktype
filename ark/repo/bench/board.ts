// prints the homepage board's numbers by the rule in
// ark/docs/lib/bench/units.ts, which is the code the site itself runs: per
// category, the geometric mean of each library's results over the largest set
// of other projects' results that ArkType, Zod and three more named
// libraries all ran, and its place among every library that ran them all.
// Under each graph are the same libraries on our own benchmark.
//
// pnpm benchBoard          the published results (ark/docs/lib/bench/*.json)
// pnpm benchBoard --fresh  beside them, what this checkout last measured:
//   external/out/fresh/leaderboard.json  pnpm benchExternal <suite>
//   out/validate.json                    pnpm benchValidate
//   out/import.json                      pnpm benchImport
//   out/size.json                        pnpm benchSize
import { existsSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import {
	isOwnSuite,
	rowsOfSuite,
	type CategoryId,
	type ResultRow,
	type SuiteRow
} from "../../docs/lib/bench/leaderboard.ts"
import {
	sharedRows,
	sourcesOf,
	standingsOver,
	unitBoardOver,
	unitBoards,
	unitText,
	type UnitStanding
} from "../../docs/lib/bench/units.ts"
import { median } from "./stats.ts"

const here = import.meta.dirname
const fresh = process.argv.includes("--fresh")

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"))

const ordinal = (n: number) =>
	n % 10 === 1 && n % 100 !== 11 ? `${n}st`
	: n % 10 === 2 && n % 100 !== 12 ? `${n}nd`
	: n % 10 === 3 && n % 100 !== 13 ? `${n}rd`
	: `${n}th`

type Column = {
	title: string
	standings: UnitStanding[]
}

// each library's place and mean a column, in the first column's order
const print = (
	title: string,
	format: (value: number) => string,
	columns: Column[]
) => {
	console.log(`\n${title}`)
	const libraries = [
		...new Set(columns.flatMap(column => column.standings.map(s => s.library)))
	]
	console.table(
		Object.fromEntries(
			libraries.map(library => [
				library,
				Object.fromEntries(
					columns.map(column => {
						const standing = column.standings.find(s => s.library === library)
						return [
							column.title,
							standing ?
								`${ordinal(standing.place)}  ${format(standing.value)}`
							:	"—"
						]
					})
				)
			])
		)
	)
}

type FreshSuite = {
	category: string
	label: string
	rows: ResultRow[]
}

// the leaderboard reproduce.ts wrote from this checkout's runs, each suite
// it reran in place of its published rows
const freshPath = join(here, "external/out/fresh/leaderboard.json")
const freshSuites: FreshSuite[] | undefined =
	fresh && existsSync(freshPath) ? read(freshPath).suites : undefined

const freshRowsOf = (id: CategoryId): SuiteRow[] =>
	freshSuites!
		.filter(suite => suite.category === id && !isOwnSuite(suite.label))
		.flatMap(suite => suite.rows.map(row => ({ ...row, suite: suite.label })))

if (fresh) {
	console.log(
		freshSuites ?
			`fresh: ${freshPath}, written ${statSync(freshPath).mtime.toISOString()}`
		:	"fresh: no external/out/fresh/leaderboard.json yet (pnpm benchExternal <suite>)"
	)
}

for (const board of Object.values(unitBoards)) {
	const sources = sourcesOf(board)
		.map(source => `${source.label} (${source.results})`)
		.join(", ")
	print(
		`${board.id}: ${board.unit}, geometric mean of ${board.rows.length} results: ${sources}`,
		board.format,
		[
			{ title: "published", standings: board.standings },
			...(freshSuites ?
				[
					{
						title: "fresh",
						standings: unitBoardOver(board.id, freshRowsOf(board.id)).standings
					}
				]
			:	[])
		]
	)
}

// our own benchmark's arms, as the leaderboard names them. ArkType's row is
// its default precompiled build; its other builds aren't on the board
const names: Record<string, string> = {
	standalone: "ArkType",
	zod: "Zod",
	zodCompiled: "Zod (compiled)",
	zodMini: "Zod Mini",
	valibot: "Valibot",
	typia: "Typia",
	typebox: "TypeBox",
	ajv: "ajv"
}

// a result an arm, by app or scenario, as rows of named libraries
const rowsOf = (byRow: Record<string, Record<string, number>>): ResultRow[] =>
	Object.entries(byRow).map(([id, byArm]) => ({
		id,
		results: Object.fromEntries(
			Object.entries(byArm).flatMap(([arm, value]) => {
				// a starred arm ran the library's nearest mode to the row's
				const name = names[arm.replace("*", "")]
				return name ? [[name, value]] : []
			})
		)
	}))

type Own = {
	title: string
	suite: string
	format: (value: number) => string
	/** this checkout's run of it, if --fresh and there is one */
	path: string
	rows: (data: any) => ResultRow[]
}

const mapValues = <from, to>(
	record: Record<string, from>,
	map: (value: from) => to
): Record<string, to> =>
	Object.fromEntries(
		Object.entries(record).map(([key, value]) => [key, map(value)])
	)

const own: Own[] = [
	{
		title: "our benchmark, speed: ns per validation",
		suite: "homepage",
		format: unitText.ns,
		path: join(here, "out/validate.json"),
		// each arm's median over the passes
		rows: (data: Record<string, Record<string, number[]>>) =>
			rowsOf(mapValues(data, byArm => mapValues(byArm, median)))
	},
	{
		title: "our apps, cold start: ms from import to first validation",
		suite: "homepageStartup",
		format: unitText.ms,
		path: join(here, "out/import.json"),
		// "login (zod)": each process's load and first parse, with no compile cache
		rows: (
			data: Record<string, { cold: { load: number; firstParse: number }[] }>
		) => {
			const byApp: Record<string, Record<string, number>> = {}
			for (const [key, { cold }] of Object.entries(data)) {
				const [, app, arm] = /^(\S+) \((.+)\)$/.exec(key)!
				;(byApp[app] ??= {})[arm] = median(
					cold.map(sample => sample.load + sample.firstParse)
				)
			}
			return rowsOf(byApp)
		}
	},
	{
		title: "our apps, bundle: kB gzipped",
		suite: "homepageSize",
		format: unitText.kB,
		path: join(here, "out/size.json"),
		rows: (data: Record<string, Record<string, { gzip: number }>>) =>
			rowsOf(mapValues(data, byArm => mapValues(byArm, size => size.gzip)))
	}
]

for (const { title, suite, format, path, rows } of own) {
	const published = sharedRows(rowsOfSuite(suite))
	const columns: Column[] = [
		{ title: "published", standings: standingsOver(published) }
	]
	if (fresh && existsSync(path)) {
		// over the published rows, so the two columns average the same ones
		const ids = published.map(row => row.id)
		columns.push({
			title: "fresh",
			standings: standingsOver(
				sharedRows(rows(read(path)).filter(row => ids.includes(row.id)))
			)
		})
	}
	print(
		`${title}, geometric mean of the ${published.length} every library ran`,
		format,
		columns
	)
}
