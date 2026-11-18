/**
 * Bundle size as an app's Types grow, for the homepage's size drill-down:
 * per corpus, each arm's gzipped bytes at each scale, and where ArkType's
 * builds are the smaller one. The chart, its table and its cutoff lines read
 * only `sizeCurves`, so denser data (more corpora, scales or arms) replaces
 * it below without touching any of them.
 *
 * A corpus is one kind of schema, measured at several scales. What a
 * library ships per schema depends on what the schema holds, so a result on
 * one corpus says nothing about another: schemas with a custom message on
 * most fields are a different corpus from schemas with none.
 *
 * Today there is one, the bigapp board's generated apps bundled with
 * esbuild, the only host that also measures plain arktype
 * (lib/bench/scoreboard.ts).
 */
import { generatedRows, scoreboard, type AppRow } from "./scoreboard.ts"

/** gold for ArkType's builds, neutral for every other library */
export type CurveArmKind = "default" | "smallest" | "dynamic" | "other"

export type CurveArm = {
	/** the arm's key in each point's `gz` */
	id: string
	label: string
	kind: CurveArmKind
	/** how its line is drawn, so two arms of a kind never read alike */
	line: "solid" | "dashed" | "dotted"
}

/** each arm's gzipped bytes, absent where it wasn't measured */
export type CurveBytes = Record<string, number>

export type CurvePoint = {
	/** how many Types the app defines */
	types: number
	gz: CurveBytes
}

/** one of ArkType's builds against another library, on one corpus */
export type CurveCutoff = {
	ours: CurveArm
	rival: CurveArm
	/**
	 * where ours is the smaller and where it isn't, in words that state no
	 * more than was measured: "smaller at 11 to 230 Types; larger at 1,012"
	 */
	where: string
}

export type CurveCorpus = {
	id: string
	/** the corpus in a few words, as a heading */
	label: string
	/** what was bundled, and how, in a sentence */
	source: string
	/** what its schemas hold and don't, which is what its results are scoped to */
	scope: string
	/** in the order the chart's key lists them */
	arms: CurveArm[]
	/** ascending by `types` */
	points: CurvePoint[]
	cutoffs: CurveCutoff[]
}

export type SizeCurves = {
	commit: string
	corpora: CurveCorpus[]
}

const arms: CurveArm[] = [
	{ id: "arktype", label: "ArkType, dynamic", kind: "dynamic", line: "dotted" },
	{ id: "zod", label: "Zod 4", kind: "other", line: "solid" },
	{
		id: "precompiled",
		label: "ArkType, default build",
		kind: "default",
		line: "solid"
	},
	{ id: "valibot", label: "Valibot", kind: "other", line: "dashed" },
	{
		id: "smallest",
		label: 'ArkType, "smallest"',
		kind: "smallest",
		line: "dashed"
	}
]

/** a scale as the board measured it: as drawn, and again with narrows on its shared Types */
type MeasuredPoint = CurvePoint & { withNarrows: CurveBytes[] }

const bytesOf = (row: AppRow): CurveBytes =>
	Object.fromEntries(
		arms
			.filter(arm => arm.id in row.arms)
			.map(arm => [arm.id, row.arms[arm.id].gz])
	)

const bundled = generatedRows.filter(row => row.host === "esbuild")

const measured: MeasuredPoint[] = bundled
	.filter(row => !row.narrows)
	.map(row => ({
		types: Number(row.app),
		gz: bytesOf(row),
		withNarrows: bundled
			.filter(other => other.app === row.app && other.narrows)
			.map(bytesOf)
	}))
	.sort((l, r) => l.types - r.types)

const measuredArms = arms.filter(arm => bundled.some(row => arm.id in row.arms))

const countText = (types: number) => types.toLocaleString("en-US")

const scalesText = (types: number[]) =>
	types.length === 1 ?
		countText(types[0])
	:	`${countText(types[0])} to ${countText(types.at(-1)!)}`

/**
 * One of ArkType's builds against another library, scale by scale. It is
 * the smaller at a scale only if it is as drawn and with narrows; a cutoff
 * lies between the last scale it is smaller at and the first it isn't, and
 * nothing is interpolated.
 */
const whereOf = (ours: CurveArm, rival: CurveArm): string => {
	const has = (bytes: CurveBytes) => ours.id in bytes && rival.id in bytes
	const smaller = (bytes: CurveBytes) => bytes[ours.id] < bytes[rival.id]
	/** how many of the ways a scale was measured have ours the smaller */
	const share = (point: MeasuredPoint) => {
		const ways = [point.gz, ...point.withNarrows.filter(has)]
		return ways.filter(smaller).length / ways.length
	}
	const both = measured.filter(point => has(point.gz))
	const typesOf = (of: MeasuredPoint[]) => of.map(point => point.types)
	const smallerAt = typesOf(both.filter(point => share(point) === 1))
	const mixedAt = typesOf(
		both.filter(point => share(point) > 0 && share(point) < 1)
	)
	const largerAt = typesOf(both.filter(point => share(point) === 0))
	if (!mixedAt.length && !largerAt.length)
		return "smaller at every scale measured"
	if (!mixedAt.length && !smallerAt.length)
		return "larger at every scale measured"
	return [
		smallerAt.length && `smaller at ${scalesText(smallerAt)} Types`,
		mixedAt.length &&
			`at ${scalesText(mixedAt)}, smaller as drawn and larger with narrows`,
		largerAt.length && `larger at ${scalesText(largerAt)}`
	]
		.filter(Boolean)
		.join("; ")
}

export const sizeCurves: SizeCurves = {
	commit: scoreboard.commit,
	corpora: [
		{
			id: "models",
			label: "Data models",
			source:
				"apps we generated from our startup benchmark's SaaS schemas, each Type validating a request in a handler, bundled and minified with esbuild as a production build",
			scope:
				"These schemas carry no custom messages, and narrows only where a line below says so. Form-like schemas, with a message on most fields, are a separate corpus: what a library ships per schema differs there, so these cutoffs don't carry over to it.",
			arms: measuredArms,
			points: measured.map(({ types, gz }) => ({ types, gz })),
			cutoffs: measuredArms
				.filter(arm => arm.kind !== "other")
				.flatMap(ours =>
					measuredArms
						.filter(arm => arm.kind === "other")
						.map(rival => ({ ours, rival, where: whereOf(ours, rival) }))
				)
		}
	]
}
