/**
 * Whole apps, from scoreboard.json: the bigapp board (ark/repo/bench/bigapp),
 * ArkType's precompiled builds against each other library on generated apps
 * of 11 to 1,012 Types, with and without narrows, and on ntwine's
 * packages/shared, through esbuild, webpack and Next on Turbopack. Bytes are
 * exact; on a count, a build beats a library only with the lower median at
 * p < 0.05, as the board's cells decide. `pnpm benchBigApp board` reruns it
 * and `node ark/repo/bench/bigapp/scoreboard.ts <result>` rewrites the data.
 */
import data from "./scoreboard.json" with { type: "json" }

export type Build = "precompiled" | "smallest"

/** ArkType's arms: its precompiled builds and plain arktype, without the plugin */
export type Ours = Build | "arktype"

export type Count = "import" | "first" | "hot"

export type Measure = "gz" | Count

export type Host = "esbuild" | "webpack" | "turbopack"

export type AppRow = {
	host: Host
	/** a generated app's Types, or "ntwine" */
	app: string
	narrows: boolean
	/** each arm's bytes and median counts */
	arms: Record<string, Record<Measure, number>>
	/** each of ArkType's arms' sign test against each other arm */
	p: Partial<Record<Ours, Record<string, Record<Count, number>>>>
}

export const scoreboard = data as Omit<
	typeof data,
	"failed" | "ntwine" | "rows"
> & {
	/** arms that couldn't load or validate */
	failed: string[]
	ntwine: { repo: string | null; migration: string | null }
	rows: AppRow[]
}

/** ArkType's arms: its precompiled builds and plain arktype */
const ours = ["precompiled", "smallest", "arktype"]

export const rivalsOf = (row: AppRow) =>
	Object.keys(row.arms).filter(library => !ours.includes(library))

/** the apps generated from the startup benchmark's SaaS schemas, which anyone can rebuild */
export const generatedRows = scoreboard.rows.filter(row => row.app !== "ntwine")

/** whether the board has generated apps, each with both builds and Zod, and no arm that failed to load or validate */
export const generatedComplete =
	generatedRows.length > 0 &&
	generatedRows.every(
		row => row.arms.precompiled && row.arms.smallest && row.arms.zod
	) &&
	scoreboard.failed.every(arm => arm.includes("ntwine"))

/** ntwine's rows, stated only once its migration has a public commit */
export const ntwineRows = scoreboard.rows.filter(row => row.app === "ntwine")

/** whether a build beats every other library on an app */
export const beats = (row: AppRow, build: Build, measure: Measure) => {
	const mine = row.arms[build]
	return (
		!!mine &&
		rivalsOf(row).every(
			library =>
				mine[measure] < row.arms[library][measure] &&
				(measure === "gz" || row.p[build]![library][measure] < 0.05)
		)
	)
}

/** how far below the best other library a build is on an app: 0.1 for 10% less, negative above it */
export const marginOf = (row: AppRow, build: Build, measure: Measure) =>
	1 -
	row.arms[build][measure] /
		Math.min(...rivalsOf(row).map(library => row.arms[library][measure]))

/** the other library with the least of a measure on an app */
export const bestRivalOf = (row: AppRow, measure: Measure) =>
	rivalsOf(row).reduce((l, r) =>
		row.arms[r][measure] < row.arms[l][measure] ? r : l
	)

export type Sweep = {
	build: Build
	won: AppRow[]
	lost: AppRow[]
	/** the smallest margin among the apps it won */
	thinnest: number
	/** the largest p against any library on the apps it won */
	p: number
}

export const sweepOf = (
	rows: AppRow[],
	build: Build,
	measure: Measure
): Sweep => {
	const won = rows.filter(row => beats(row, build, measure))
	return {
		build,
		won,
		lost: rows.filter(row => !won.includes(row)),
		thinnest: Math.min(...won.map(row => marginOf(row, build, measure))),
		p:
			measure === "gz" ? 0 : (
				Math.max(
					0,
					...won.flatMap(row =>
						rivalsOf(row).map(library => row.p[build]![library][measure])
					)
				)
			)
	}
}

/** the build that beats every other library on the most apps, the default where both tie */
export const bestSweepOf = (rows: AppRow[], measure: Measure): Sweep => {
	const fastest = sweepOf(rows, "precompiled", measure)
	const smallest = sweepOf(rows, "smallest", measure)
	return smallest.won.length > fastest.won.length ? smallest : fastest
}
