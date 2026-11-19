/**
 * The homepage board's numbers in the units they were measured in, by one
 * rule in every category:
 *
 * 1. The results are other projects' benchmarks: leaderboard.ts's
 *    independent suites, none of them designed by us.
 * 2. A graph has five lanes: ArkType, Zod and three more libraries the site
 *    names. It averages the largest set of results that five such libraries
 *    all ran ({@link widestShared}), so every bar is over the same work and
 *    as much of the data as five libraries share is used.
 * 3. Every library that ran all of those results is ranked, named or not, by
 *    the geometric mean of its results ({@link standingsOver}): a ratio
 *    scale, where no one result decides the average.
 * 4. The lanes drawn are ArkType, the three best-placed other libraries the
 *    site names, and Zod.
 *
 * Which results are averaged depends only on who ran what, never on what
 * they scored. Places are plain order, computed here, so nothing on the site
 * is first unless these results say so: the headline's superlatives
 * (lib/claims.ts), the board and the Benchmarks page all read
 * {@link unitBoards}.
 *
 * Beside each lane is the same library on our own benchmark, in a unit most
 * readers think in (ns, ms). Those are {@link ownFigures}: additional data,
 * and no place is taken from them.
 */
import {
	geomean,
	independentRowsOf,
	isWellKnown,
	rowsOfSuite,
	type CategoryId,
	type ResultRow,
	type SuiteRow
} from "./leaderboard.ts"

const librariesOf = (rows: readonly ResultRow[]) => [
	...new Set(rows.flatMap(row => Object.keys(row.results)))
]

/** the rows each of `libraries` has a result on */
export const rowsRunBy = <row extends ResultRow>(
	rows: readonly row[],
	libraries: readonly string[]
): row[] =>
	rows.filter(row => libraries.every(library => library in row.results))

/** the rows every library with a result on any of them has a result on */
export const sharedRows = <row extends ResultRow>(
	rows: readonly row[]
): row[] => rowsRunBy(rows, librariesOf(rows))

/** a result's place among results where lower is better: equal ones share it */
export const placeAmong = (values: readonly number[], value: number) =>
	values.filter(other => other < value).length + 1

export type UnitStanding = {
	library: string
	/** the geometric mean of its results, in the rows' unit */
	value: number
	place: number
}

/**
 * Each library with a result on every row, by the geometric mean of its
 * results, lowest first. A library missing from any row isn't ranked: its
 * mean would be over other rows than the rest.
 */
export const standingsOver = (rows: readonly ResultRow[]): UnitStanding[] => {
	const means = librariesOf(rows)
		.filter(library => rows.every(row => library in row.results))
		.map(library => ({
			library,
			value: geomean(rows.map(row => row.results[library]))
		}))
	const values = means.map(mean => mean.value)
	return means
		.map(mean => ({ ...mean, place: placeAmong(values, mean.value) }))
		.sort((l, r) => l.value - r.value)
}

const combinationsOf = <t>(items: readonly t[], size: number): t[][] =>
	size === 0 ? [[]]
	: items.length < size ? []
	: [
			...combinationsOf(items.slice(1), size - 1).map(rest => [
				items[0],
				...rest
			]),
			...combinationsOf(items.slice(1), size)
		]

/**
 * The largest set of rows that every one of `required` and at least `others`
 * of `candidates` all have a result on. Of sets as large, the one more
 * libraries ran in full, then the one found first, so the order of
 * `candidates` settles what is left. Empty if no such set exists.
 */
export const widestShared = <row extends ResultRow>(
	rows: readonly row[],
	required: readonly string[],
	candidates: readonly string[],
	others: number
): row[] => {
	const base = rowsRunBy(rows, required)
	const present = candidates.filter(library =>
		base.some(row => library in row.results)
	)
	let widest: row[] = []
	let ranked = 0
	for (const group of combinationsOf(present, others)) {
		const shared = rowsRunBy(base, group)
		if (shared.length < widest.length || shared.length === 0) continue
		const inFull = standingsOver(shared).length
		if (shared.length > widest.length || inFull > ranked) {
			widest = shared
			ranked = inFull
		}
	}
	return widest
}

const thousands = (n: number) => n.toLocaleString("en-US")

/** two decimals under 10, one under 100, none above: "0.87", "24.7", "117" */
const scaled = (n: number) =>
	n < 10 ? n.toFixed(2)
	: n < 100 ? n.toFixed(1)
	: thousands(Math.round(n))

/** a quantity as the board prints it, each in its own unit */
export const unitText = {
	/** a count of CPU instructions: "40", "664", "15,028", "120k", "1.32M" */
	instructions: (count: number) =>
		count >= 1e6 ? `${scaled(count / 1e6)}M`
		: count >= 1e5 ? `${Math.round(count / 1e3)}k`
		: thousands(Math.round(count)),
	/** bytes as a number of kilobytes: "1.03", "0.93", "25.1" */
	kilobytes: (bytes: number) => scaled(bytes / 1000),
	/** bytes in kilobytes: "1.35 kB" */
	kB: (bytes: number) => `${scaled(bytes / 1000)} kB`,
	/** "123 ns", "2,012 ns" */
	ns: (ns: number) =>
		`${ns >= 1000 ? thousands(Math.round(ns)) : ns.toPrecision(3)} ns`,
	/** calls a second at so many ns a call: "8.1M", "497k" */
	rate: (ns: number) => {
		const rate = 1e9 / ns
		return rate >= 1e6 ?
				`${(rate / 1e6).toPrecision(2)}M`
			:	`${Math.round(rate / 1e3)}k`
	},
	/** "3.90 ms" */
	ms: (ms: number) => `${scaled(ms)} ms`
}

/** the library every graph keeps a lane for, wherever it places */
export const incumbent = "Zod"

/**
 * The zod package's other entry points and its previous major. Zod has its
 * lane as most people import it, so these don't take another library's; the
 * tables list them like any other.
 */
const incumbentVariants = ["Zod (compiled)", "Zod Mini", "Zod 3"]

/**
 * whether `library` has the lowest mean among `standings`, shared with no
 * one: what a superlative needs, in plain order
 */
export const isFirstOutright = (
	standings: readonly UnitStanding[],
	library: string
) => {
	const first = standings.filter(standing => standing.place === 1)
	return first.length === 1 && first[0].library === library
}

/** the lanes a graph has beside ArkType's and Zod's */
export const rivalsDrawn = 3

const isRival = (library: string) =>
	library !== "ArkType" &&
	library !== incumbent &&
	!incumbentVariants.includes(library) &&
	isWellKnown(library)

export type UnitBoard = {
	id: CategoryId
	/** what a bar measures: "CPU instructions per validation" */
	unit: string
	/** the results averaged, each with the benchmark it is from */
	rows: SuiteRow[]
	/** every library that ran all of them, lowest mean first */
	standings: UnitStanding[]
	/** ArkType, the best rivals and Zod, in the order they place */
	lanes: string[]
	/** a mean as the board prints it */
	format: (value: number) => string
	/** a mean as a sentence states it: "664 CPU instructions per validation" */
	quantity: (value: number) => string
	/** a point on the graph's axis; the last one names the unit */
	tick: (value: number, last: boolean) => string
}

type UnitWording = Pick<UnitBoard, "unit" | "format" | "quantity" | "tick">

const wording = {
	speed: {
		unit: "CPU instructions per validation",
		format: unitText.instructions,
		quantity: count =>
			`${unitText.instructions(count)} CPU instructions per validation`,
		tick: unitText.instructions
	},
	// both of the public startup results time creating a schema
	startup: {
		unit: "CPU instructions to create a schema",
		format: unitText.instructions,
		quantity: count =>
			`${unitText.instructions(count)} CPU instructions to create a schema`,
		tick: unitText.instructions
	},
	size: {
		unit: "kB gzipped",
		format: unitText.kB,
		quantity: bytes => `${unitText.kB(bytes)} gzipped`,
		tick: (bytes, last) => (last ? `${bytes / 1000} kB` : `${bytes / 1000}`)
	}
} satisfies Record<CategoryId, UnitWording>

/**
 * The results a graph over `rows` averages: the largest set that ArkType,
 * Zod and {@link rivalsDrawn} more named libraries all ran. Should two sets
 * be as large and as many libraries have run each in full, the libraries'
 * names in alphabetical order settle it, so no score ever does. Empty if
 * `rows` has no such set.
 */
export const averagedRows = <row extends ResultRow>(rows: readonly row[]) =>
	widestShared(
		rows,
		["ArkType", incumbent],
		librariesOf(rows).filter(isRival).sort(),
		rivalsDrawn
	)

/** A graph over `rows`, by the rule above. */
export const unitBoardOver = (
	id: CategoryId,
	rows: readonly SuiteRow[]
): UnitBoard => {
	const shared = averagedRows(rows)
	if (!shared.length) {
		throw new Error(
			`No ${id} result has ArkType, ${incumbent} and ${rivalsDrawn} more named libraries on it`
		)
	}
	const standings = standingsOver(shared)
	const rivals = standings
		.map(standing => standing.library)
		.filter(isRival)
		.slice(0, rivalsDrawn)
	return {
		id,
		...wording[id],
		rows: shared,
		standings,
		lanes: standings
			.map(standing => standing.library)
			.filter(
				library =>
					library === "ArkType" ||
					library === incumbent ||
					rivals.includes(library)
			)
	}
}

const boardOf = (id: CategoryId) => unitBoardOver(id, independentRowsOf(id))

/** the board's three graphs */
export const unitBoards = {
	speed: boardOf("speed"),
	startup: boardOf("startup"),
	size: boardOf("size")
} satisfies Record<CategoryId, UnitBoard>

export type UnitSource = {
	/** the benchmark, by its suite's label: "schemabenchmarks.dev" */
	label: string
	/** how many of the graph's results are its */
	results: number
}

/**
 * The benchmarks among `rows` without which `library` wouldn't be first
 * outright: each one whose results, left out, leave a graph it isn't first
 * on, or no five libraries sharing a result to draw one from.
 */
export const firstDependsOn = (
	rows: readonly SuiteRow[],
	library: string
): string[] =>
	[...new Set(rows.map(row => row.suite))].filter(
		label =>
			!isFirstOutright(
				standingsOver(averagedRows(rows.filter(row => row.suite !== label))),
				library
			)
	)

/** the benchmarks a graph's results are from, in the order they appear */
export const sourcesOf = ({ rows }: UnitBoard): UnitSource[] =>
	[...new Set(rows.map(row => row.suite))].map(label => ({
		label,
		results: rows.filter(row => row.suite === label).length
	}))

// the homepage's benchmark: median ns per call, a row a scenario, over the
// scenarios every library on it ran
const ownSpeed = standingsOver(sharedRows(rowsOfSuite("homepage")))

// the homepage's cold start: ms from import through an app's first
// validation, a row an app, over the apps every library on it started
const ownStartup = standingsOver(sharedRows(rowsOfSuite("homepageStartup")))

export type OwnFigure = {
	/** "123 ns", "3.90 ms" */
	text: string
	/** speed only, validations a second: "8.1M" */
	rate?: string
}

/**
 * Each library on our own benchmark, in the unit readers think in: its
 * geometric mean over the scenarios, or apps, every library there ran. Size
 * has none: its graph is in kilobytes already.
 */
export const ownFigures: Record<CategoryId, Record<string, OwnFigure>> = {
	speed: Object.fromEntries(
		ownSpeed.map(({ library, value }) => [
			library,
			{ text: unitText.ns(value), rate: unitText.rate(value) }
		])
	),
	startup: Object.fromEntries(
		ownStartup.map(({ library, value }) => [
			library,
			{ text: unitText.ms(value) }
		])
	),
	size: {}
}

/** how many scenarios, and apps, {@link ownFigures} are means over */
export const ownRows = {
	speed: sharedRows(rowsOfSuite("homepage")).length,
	startup: sharedRows(rowsOfSuite("homepageStartup")).length
}
