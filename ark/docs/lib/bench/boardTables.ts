/**
 * The Benchmarks page's tables behind the homepage's board, as text: each
 * graph's standings, every result it averages, and our own benchmark's
 * numbers beside them. The page's components and its Markdown render the
 * same cells.
 */
import {
	independentRowsOf,
	isWellKnown,
	measuredOf,
	rowsOfSuite,
	type CategoryId,
	type ResultRow,
	type SuiteRow
} from "./leaderboard.ts"
import {
	ownFigures,
	sharedRows,
	sourcesOf,
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
 * The public results of a category that its graph doesn't average: the ones
 * the libraries sharing the largest set didn't all run.
 */
export const leftOutRows = (id: CategoryId): SuiteRow[] =>
	independentRowsOf(id).filter(
		row =>
			!unitBoards[id].rows.some(
				averaged => averaged.suite === row.suite && averaged.id === row.id
			)
	)

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`

const listed = (items: string[]) =>
	items.length < 3 ?
		items.join(" and ")
	:	`${items.slice(0, -1).join(", ")} and ${items.at(-1)}`

/**
 * Which public results a graph leaves out and why, as a sentence. Undefined
 * where it averages every one.
 */
export const leftOutText = (id: CategoryId) => {
	const rows = leftOutRows(id)
	if (!rows.length) return
	const suites = [...new Set(rows.map(row => row.suite))]
	const averaged = unitBoards[id].rows.length
	return `Not averaged: ${plural(rows.length, "more public result")}, from ${listed(suites)}. No set larger than ${averaged === 2 ? "these two" : `these ${averaged}`} was run in full by ArkType, Zod and three more libraries the site names.`
}

/** the most results a turned table lists that its graph doesn't average */
const leftOutColumns = 2

/**
 * Every result a graph averages. With few libraries, a result a row and a
 * library a column; with many, turned, and then every named library with a
 * result on any of them is listed, ranked or not, and the category's other
 * public results, if they're few, are columns after the mean.
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
	const others = leftOutRows(id)
	const extra = others.length <= leftOutColumns ? others : []
	const libraries = [
		...ranked,
		...[
			...new Set(
				[...board.rows, ...extra].flatMap(row => Object.keys(row.results))
			)
		].filter(library => !ranked.includes(library))
	].filter(isWellKnown)
	const cell = (row: SuiteRow, library: string) =>
		library in row.results ? board.format(row.results[library]) : "—"
	return {
		header: [
			"Library",
			...board.rows.map(row => row.suite),
			"Geometric mean",
			"Place",
			...extra.map(row => `Not averaged: ${row.suite}`)
		],
		rows: libraries.map(library => {
			const standing = placeOf(library)
			return [
				library,
				...board.rows.map(row => cell(row, library)),
				standing ? board.format(standing.value) : "—",
				standing ? ordinal(standing.place) : "—",
				...extra.map(row => cell(row, library))
			]
		})
	}
}

const dayText = (date: string) =>
	new Date(date).toLocaleDateString("en-US", {
		timeZone: "UTC",
		year: "numeric",
		month: "long",
		day: "numeric"
	})

/**
 * When each benchmark on the board was measured: a benchmark a row, with the
 * results each graph takes from it, the day the other libraries' newest
 * results were measured and the commit ArkType's were measured at.
 */
export const runsTable = (): TextTable => ({
	header: [
		"Benchmark",
		"On the board",
		"Other libraries last measured",
		"ArkType at"
	],
	rows: Object.values(unitBoards).flatMap(board =>
		sourcesOf(board).map(({ label, results }) => {
			const { rivals, arkType } = measuredOf(label)
			return [
				label,
				`${plural(results, `${board.id} result`)}`,
				dayText(rivals),
				arkType
			]
		})
	)
})

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
