/**
 * The Benchmarks page's tables behind the homepage's board, as text: each
 * graph's standings, every result it averages, and our own benchmark's
 * numbers beside them. The page's components and its Markdown render the
 * same cells.
 */
import { averageText, pickThreeTable } from "../claims.ts"
import {
	isWellKnown,
	leaderboards,
	rowsOfSuite,
	type CategoryId,
	type ResultRow
} from "./leaderboard.ts"
import {
	ownFigures,
	placeAmong,
	sharedRows,
	standingsOver,
	unitBoards,
	unitText,
	type UnitStanding
} from "./units.ts"

export type TextTable = {
	header: string[]
	rows: string[][]
}

const ordinal = (n: number) =>
	n % 10 === 1 && n % 100 !== 11 ? `${n}st`
	: n % 10 === 2 && n % 100 !== 12 ? `${n}nd`
	: n % 10 === 3 && n % 100 !== 13 ? `${n}rd`
	: `${n}th`

/** a result's name, with no pipe to end a Markdown cell early */
const resultName = (id: string) => id.replaceAll("|", ", ")

/** what the second column of a graph's standings is headed, by category */
const ownHeadings: Record<CategoryId, string | undefined> = {
	speed: "Our benchmark, ns per validation",
	startup: "Our apps, import to first validation",
	size: undefined
}

/**
 * A graph's standings: every library that ran all of its results, with its
 * place and geometric mean, and the same library on our own benchmark where
 * it is on it. A library the site doesn't name keeps its place and its mean
 * without its name.
 */
export const standingsTable = (id: CategoryId): TextTable => {
	const board = unitBoards[id]
	const own = ownHeadings[id]
	return {
		header: ["Place", "Library", board.unit, ...(own ? [own] : [])],
		rows: board.standings.map(({ library, place, value }) => [
			ordinal(place),
			isWellKnown(library) ? library : "(under 100k downloads a week)",
			board.format(value),
			...(own ? [ownFigures[id][library]?.text ?? "—"] : [])
		])
	}
}

/**
 * Every result a graph averages. With few libraries, a result a row and a
 * library a column; with many, turned, and then every named library with a
 * result on any of them is listed, ranked or not.
 */
export const resultsTable = (id: CategoryId): TextTable => {
	const board = unitBoards[id]
	const ranked = board.standings.map(standing => standing.library)
	if (board.rows.length > ranked.length) {
		const named = ranked.filter(isWellKnown)
		return {
			header: ["Benchmark", "Result", ...named],
			rows: board.rows.map(row => [
				row.suite,
				resultName(row.id),
				...named.map(library => board.format(row.results[library]))
			])
		}
	}
	const placeOf = (library: string) =>
		board.standings.find(standing => standing.library === library)
	const listed = [
		...ranked,
		...[...new Set(board.rows.flatMap(row => Object.keys(row.results)))].filter(
			library => !ranked.includes(library)
		)
	].filter(isWellKnown)
	return {
		header: [
			"Library",
			...board.rows.map(row => row.suite),
			"Geometric mean",
			"Place"
		],
		rows: listed.map(library => {
			const standing = placeOf(library)
			return [
				library,
				...board.rows.map(row =>
					library in row.results ? board.format(row.results[library]) : "—"
				),
				standing ? board.format(standing.value) : "—",
				standing ? ordinal(standing.place) : "—"
			]
		})
	}
}

type OwnTable = {
	suite: string
	format: (value: number) => string
}

/** our own benchmark's suites that have a table of their own here */
const ownTables = {
	/** startup.ts: instructions from import through the first validation, beyond an empty module's */
	startupInstructions: { suite: "startup", format: unitText.instructions },
	/** the homepage's cold start, by the clock */
	startupMs: { suite: "homepageStartup", format: unitText.ms },
	/** the homepage's apps, bundled */
	size: { suite: "homepageSize", format: unitText.kB }
} satisfies Record<string, OwnTable>

export type OwnTableId = keyof typeof ownTables

/**
 * One of our own benchmark's suites, a library a row: its result on every
 * app, then its geometric mean and place over the apps every library ran.
 */
export const ownTable = (id: OwnTableId): TextTable => {
	const { suite, format } = ownTables[id]
	const rows: ResultRow[] = rowsOfSuite(suite)
	const shared = sharedRows(rows)
	const standings: UnitStanding[] = standingsOver(shared)
	const mean =
		shared.length === rows.length ?
			"Geometric mean"
		:	`Geometric mean of ${shared.map(row => row.id).join(", ")}`
	return {
		header: ["Library", ...rows.map(row => row.id), mean, "Place"],
		rows: standings.map(({ library, value, place }) => [
			library,
			...rows.map(row =>
				library in row.results ? format(row.results[library]) : "—"
			),
			format(value),
			ordinal(place)
		])
	}
}

/** our benchmark's speed in one number a library: the geometric mean of the scenarios every library ran */
export const ownSpeedTable = (): TextTable => {
	const shared = sharedRows(rowsOfSuite("homepage"))
	return {
		header: [
			"Place",
			"Library",
			`ns per validation, geometric mean of ${shared.length} scenarios`,
			"Validations a second"
		],
		rows: standingsOver(shared).map(({ library, value, place }) => [
			ordinal(place),
			library,
			unitText.ns(value),
			unitText.rate(value)
		])
	}
}

/** an average as a multiple of the best result: "1.252×", "19.7×", "13.8k×" */
export const multiple = (score: number) =>
	score < 10 ? `${averageText(score)}×`
	: score < 1e3 ? `${score.toPrecision(3)}×`
	: score < 1e6 ? `${(score / 1e3).toPrecision(3)}k×`
	: `${(score / 1e6).toPrecision(3)}M×`

/**
 * The pooled board, which the homepage drew before it drew units: each
 * library's average ratio to the best result across every result of a
 * category, with its place among every library ranked, in plain order.
 * lib/claims.ts picks the rows.
 */
export const pooledTable = (): TextTable => ({
	header: [
		"Library",
		...pickThreeTable.categories.map(category => category.label)
	],
	rows: pickThreeTable.rows.map(({ library }) => [
		library,
		...pickThreeTable.categories.map(({ id }) => {
			const { standings } = leaderboards[id]
			const standing = standings.find(s => s.library === library)
			if (!standing) return "—"
			const place = placeAmong(
				standings.map(s => s.score),
				standing.score
			)
			return `${multiple(standing.score)}, ${ordinal(place)} of ${standings.length}`
		})
	])
})
