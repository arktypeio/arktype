/**
 * Bundle size as an app's Types grow, for the homepage's size drill-down:
 * each arm's gzipped bytes at each scale, and where ArkType's builds stop
 * being the smaller one. The chart and its table read only this module, so
 * denser data (more scales, more arms) replaces `sizeScale` below without
 * touching either.
 *
 * Today it is the bigapp board's generated apps bundled with esbuild, the
 * only host that also measures plain arktype (lib/bench/scoreboard.ts).
 */
import { generatedRows, scoreboard, type AppRow } from "./scoreboard.ts"

/** gold for ArkType's builds, neutral for every other library */
export type SizeArmKind = "default" | "smallest" | "dynamic" | "other"

export type SizeArm = {
	/** the arm's key in each point's `gz` */
	id: string
	label: string
	kind: SizeArmKind
	/** how its line is drawn, so two arms of a kind never read alike */
	line: "solid" | "dashed" | "dotted"
}

/** each arm's gzipped bytes, absent where it wasn't measured */
export type SizeBytes = Record<string, number>

export type SizePoint = {
	/** how many Types the app defines */
	types: number
	/** the app the chart draws */
	gz: SizeBytes
	/**
	 * the same scale measured another way, like with a narrow on each Type: a
	 * build counts as smaller at a scale only if it is in `gz` and in each
	 */
	variants: SizeBytes[]
}

export type SizeScale = {
	/** what was bundled, and how, in a sentence */
	source: string
	/** what `variants` vary, in a phrase: "with a narrow on each Type" */
	variant: string
	commit: string
	/** in the order the chart's key lists them */
	arms: SizeArm[]
	/** ascending by `types` */
	points: SizePoint[]
}

const arms: SizeArm[] = [
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

const bytesOf = (row: AppRow): SizeBytes =>
	Object.fromEntries(
		arms
			.filter(arm => arm.id in row.arms)
			.map(arm => [arm.id, row.arms[arm.id].gz])
	)

const bundled = generatedRows.filter(row => row.host === "esbuild")

export const sizeScale: SizeScale = {
	source:
		"apps we generated from our startup benchmark's SaaS schemas, each Type validating a request in a handler, bundled and minified with esbuild as a production build",
	variant: "with a narrow on each Type",
	commit: scoreboard.commit,
	arms: arms.filter(arm => bundled.some(row => arm.id in row.arms)),
	points: bundled
		.filter(row => !row.narrows)
		.map(row => ({
			types: Number(row.app),
			gz: bytesOf(row),
			variants: bundled
				.filter(other => other.app === row.app && other.narrows)
				.map(bytesOf)
		}))
		.sort((l, r) => l.types - r.types)
}

export type SizeCutoff = {
	ours: SizeArm
	rival: SizeArm
	/** the scales, of those both were measured at, where ours is the smaller however it was measured */
	smallerAt: number[]
	/** where it is the smaller measured one way and not another */
	mixedAt: number[]
	/** and where it isn't the smaller */
	largerAt: number[]
}

/**
 * Each of ArkType's builds against each other library, scale by scale. A
 * cutoff lies between the last scale in `smallerAt` and the first above it
 * that isn't; nothing is interpolated.
 */
export const sizeCutoffs = ({ arms, points }: SizeScale): SizeCutoff[] =>
	arms
		.filter(arm => arm.kind !== "other")
		.flatMap(ours =>
			arms
				.filter(arm => arm.kind === "other")
				.map(rival => {
					const has = (bytes: SizeBytes) =>
						ours.id in bytes && rival.id in bytes
					const smaller = (bytes: SizeBytes) => bytes[ours.id] < bytes[rival.id]
					const both = points.filter(point => has(point.gz))
					/** how many of the ways a scale was measured have ours the smaller */
					const share = (point: SizePoint) => {
						const ways = [point.gz, ...point.variants.filter(has)]
						return ways.filter(smaller).length / ways.length
					}
					const typesOf = (of: SizePoint[]) => of.map(point => point.types)
					return {
						ours,
						rival,
						smallerAt: typesOf(both.filter(point => share(point) === 1)),
						mixedAt: typesOf(
							both.filter(point => share(point) > 0 && share(point) < 1)
						),
						largerAt: typesOf(both.filter(point => share(point) === 0))
					}
				})
		)
