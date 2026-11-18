/**
 * Bundle size as an app's schemas grow, from sizeScale.json: the whole bundle
 * of a synthetic app of 1 to 5,000 distinct schemas, written alike in each
 * library, in raw minified, gzip and brotli bytes, at three seeds.
 * `pnpm benchSizeScale` (ark/repo/bench/scale/sizeScale.ts) measures it and
 * rewrites the data, and everything here is derived from it, so the page
 * reading this (content/docs/precompile/size-at-scale.mdx) follows a new run.
 *
 * `sizeScale.corpora[corpus].series` is each build's `{ schemas, raw, gzip,
 * brotli }[]`, the mean of the seeds, with the line fitted to it, and
 * `.crossovers` is where each precompiled build stops or starts being the
 * smaller of a pair.
 */
import data from "./sizeScale.json" with { type: "json" }

/** ArkType precompiled with `preset: "smallest"` and with the default options, ArkType creating its Types at runtime, then the other libraries */
export const sizeBuilds = [
	"smallest",
	"default",
	"dynamic",
	"valibot",
	"zod",
	"zodMini"
] as const

export type SizeBuild = (typeof sizeBuilds)[number]

export const sizeBuildLabels: Record<SizeBuild, string> = {
	smallest: 'ArkType precompiled, "smallest"',
	default: "ArkType precompiled, default",
	dynamic: "ArkType dynamic",
	valibot: "Valibot",
	zod: "Zod",
	zodMini: "Zod Mini"
}

export const sizeMetrics = ["raw", "gzip", "brotli"] as const

export type SizeMetric = (typeof sizeMetrics)[number]

/**
 * What an app's schemas hold. "models" have no message or function of their
 * own, as an API's do. "forms" give 35% of their fields a message and narrow
 * 25% of their unformatted strings and integers. "messages" and "narrows" have
 * one of the two each.
 */
export const sizeCorpusIds = ["models", "messages", "narrows", "forms"] as const

export type SizeCorpusId = (typeof sizeCorpusIds)[number]

export type SizePoint = {
	schemas: number
	raw: number
	gzip: number
	brotli: number
}

/**
 * bytes = fixed + slope * schemas, fitted to the counts from `sizeFitFrom` up
 * by least squares on each count's relative error, so the line is as near an
 * app of 100 schemas as one of 5,000
 */
export type SizeFit = {
	/** bytes at no schemas, where the line meets the axis */
	fixed: number
	/** bytes each further schema adds */
	slope: number
	/** the least and greatest slope of the seeds, each fitted alone */
	slopeRange: [number, number]
	/** how far the line is from a measured mean at worst, as a share of it: 0.02 is 2% */
	residual: number
}

export type SizeSeries = {
	build: SizeBuild
	label: string
	/** the mean of the seeds at each count */
	points: SizePoint[]
	/** each seed's own points */
	seeds: SizePoint[][]
	fit: Record<SizeMetric, SizeFit>
}

/** a count where the smaller of two builds changes */
export type SizeCrossing = {
	/** where the lines between the two measured counts around it meet */
	at: number
	/** the measured counts it lies between */
	between: [number, number]
	/** the least and greatest of the seeds' own crossings there */
	seedRange: [number, number]
	smallerAbove: SizeBuild
}

/** which of a precompiled build and another is the smaller, and where that changes */
export type SizeCrossover = {
	/** the precompiled build */
	build: SizeBuild
	/** what it's compared with */
	against: SizeBuild
	metric: SizeMetric
	crossings: SizeCrossing[]
	smallerAtLargest: SizeBuild
	/**
	 * where the lines through their two largest counts would meet, if that's
	 * past the largest and within twice it: a guess at growth nothing measured
	 */
	extrapolated: number | null
	/** build's bytes over against's at each count, less one: -0.1 is 10% smaller */
	margins: SizeMargin[]
}

export type SizeMargin = {
	schemas: number
	/** of the seeds' means */
	mean: number
	/** the least and greatest of the seeds */
	range: [number, number]
}

/** what one more message or narrow adds to a build at the largest count measured */
export type SizeMarginal = Record<SizeMetric, number>

export type SizeCorpus = {
	id: SizeCorpusId
	/** the fields with a message of their own per schema, and those a function checks */
	messagesPerSchema: number
	narrowsPerSchema: number
	series: Record<SizeBuild, SizeSeries>
	crossovers: SizeCrossover[]
}

type Row = (typeof data.corpora)[number]["runs"][number]["rows"][number]

const mean = (values: number[]) =>
	values.reduce((sum, value) => sum + value, 0) / values.length

/** the fit's first count: below it a bundle is still gaining the runtime its first schemas share */
export const sizeFitFrom = 100

type Line = { fixed: number; slope: number }

// weighted by 1 / bytes², which makes each count's error a share of its size
const lineOf = (points: SizePoint[], metric: SizeMetric): Line => {
	let [w, wx, wy, wxx, wxy] = [0, 0, 0, 0, 0]
	for (const point of points) {
		if (point.schemas < sizeFitFrom) continue
		const weight = 1 / point[metric] ** 2
		w += weight
		wx += weight * point.schemas
		wy += weight * point[metric]
		wxx += weight * point.schemas ** 2
		wxy += weight * point.schemas * point[metric]
	}
	const slope = (w * wxy - wx * wy) / (w * wxx - wx ** 2)
	return { fixed: (wy - slope * wx) / w, slope }
}

const fitOf = (
	points: SizePoint[],
	seeds: SizePoint[][],
	metric: SizeMetric
): SizeFit => {
	const { fixed, slope } = lineOf(points, metric)
	const slopes = seeds.map(seed => lineOf(seed, metric).slope)
	return {
		fixed,
		slope,
		slopeRange: [Math.min(...slopes), Math.max(...slopes)],
		residual: Math.max(
			...points
				.filter(point => point.schemas >= sizeFitFrom)
				.map(point =>
					Math.abs((fixed + slope * point.schemas) / point[metric] - 1)
				)
		)
	}
}

const pointOf = (row: Row, build: SizeBuild): SizePoint => ({
	schemas: row.schemas,
	...row.sizes[build]
})

const seriesOf = (
	runs: (typeof data.corpora)[number]["runs"],
	build: SizeBuild
): SizeSeries => {
	const seeds = runs.map(run => run.rows.map(row => pointOf(row, build)))
	const points = seeds[0].map(({ schemas }, i) => ({
		schemas,
		raw: Math.round(mean(seeds.map(seed => seed[i].raw))),
		gzip: Math.round(mean(seeds.map(seed => seed[i].gzip))),
		brotli: Math.round(mean(seeds.map(seed => seed[i].brotli)))
	}))
	return {
		build,
		label: sizeBuildLabels[build],
		points,
		seeds,
		fit: {
			raw: fitOf(points, seeds, "raw"),
			gzip: fitOf(points, seeds, "gzip"),
			brotli: fitOf(points, seeds, "brotli")
		}
	}
}

/** the precompiled builds, each compared with every other build but the other of the two */
export const sizeComparisons: [build: SizeBuild, against: SizeBuild][] = (
	["smallest", "default"] as const
).flatMap(build =>
	(["valibot", "zod", "zodMini", "dynamic"] as const).map(
		against => [build, against] satisfies [SizeBuild, SizeBuild]
	)
)

// where the lines through two builds' points at counts i and i + 1 meet
const meetingOf = (
	ours: SizePoint[],
	theirs: SizePoint[],
	i: number,
	metric: SizeMetric
) => {
	const before = ours[i][metric] - theirs[i][metric]
	const after = ours[i + 1][metric] - theirs[i + 1][metric]
	return (
		ours[i].schemas +
		((ours[i + 1].schemas - ours[i].schemas) * before) / (before - after)
	)
}

const crosses = (
	ours: SizePoint[],
	theirs: SizePoint[],
	i: number,
	metric: SizeMetric
) =>
	ours[i][metric] < theirs[i][metric] !==
	ours[i + 1][metric] < theirs[i + 1][metric]

const crossoverOf = (
	series: Record<SizeBuild, SizeSeries>,
	build: SizeBuild,
	against: SizeBuild,
	metric: SizeMetric
): SizeCrossover => {
	const ours = series[build]
	const theirs = series[against]
	const crossings: SizeCrossing[] = []
	for (let i = 0; i < ours.points.length - 1; i++) {
		if (!crosses(ours.points, theirs.points, i, metric)) continue
		// a seed that crosses an interval away is bounded by this one's ends
		const ofSeeds = ours.seeds.map((seed, s) =>
			crosses(seed, theirs.seeds[s], i, metric) ?
				meetingOf(seed, theirs.seeds[s], i, metric)
			: (
				seed[i][metric] < theirs.seeds[s][i][metric] ===
				ours.points[i + 1][metric] < theirs.points[i + 1][metric]
			) ?
				seed[i].schemas
			:	seed[i + 1].schemas
		)
		crossings.push({
			at: meetingOf(ours.points, theirs.points, i, metric),
			between: [ours.points[i].schemas, ours.points[i + 1].schemas],
			seedRange: [Math.min(...ofSeeds), Math.max(...ofSeeds)],
			smallerAbove:
				ours.points[i + 1][metric] < theirs.points[i + 1][metric] ?
					build
				:	against
		})
	}
	const last = ours.points.length - 1
	const smallerAtLargest =
		ours.points[last][metric] < theirs.points[last][metric] ? build : against
	const largest = ours.points[last].schemas
	const meeting = meetingOf(ours.points, theirs.points, last - 1, metric)
	return {
		build,
		against,
		metric,
		crossings,
		smallerAtLargest,
		extrapolated: meeting > largest && meeting <= largest * 2 ? meeting : null,
		margins: ours.points.map((point, i) => {
			const ofSeeds = ours.seeds.map(
				(seed, s) => seed[i][metric] / theirs.seeds[s][i][metric] - 1
			)
			return {
				schemas: point.schemas,
				mean: point[metric] / theirs.points[i][metric] - 1,
				range: [Math.min(...ofSeeds), Math.max(...ofSeeds)]
			}
		})
	}
}

const corpusOf = (id: SizeCorpusId): SizeCorpus => {
	const { runs } = data.corpora.find(corpus => corpus.id === id)!
	const series = Object.fromEntries(
		sizeBuilds.map(build => [build, seriesOf(runs, build)])
	) as Record<SizeBuild, SizeSeries>
	const largest = runs.map(run => run.rows.at(-1)!)
	return {
		id,
		messagesPerSchema: mean(largest.map(row => row.messages / row.schemas)),
		narrowsPerSchema: mean(largest.map(row => row.narrows / row.schemas)),
		series,
		crossovers: sizeComparisons.flatMap(([build, against]) =>
			sizeMetrics.map(metric => crossoverOf(series, build, against, metric))
		)
	}
}

const corpora = Object.fromEntries(
	sizeCorpusIds.map(id => [id, corpusOf(id)])
) as Record<SizeCorpusId, SizeCorpus>

/** the schemas of the largest app measured */
export const sizeScaleLargest: number = data.scales.at(-1)!

// what each message or narrow adds at the largest count: a corpus with only
// those, less the models it's made from, over how many it has
const marginalOf = (
	build: SizeBuild,
	corpus: "messages" | "narrows"
): SizeMarginal => {
	const count =
		(corpus === "messages" ?
			corpora.messages.messagesPerSchema
		:	corpora.narrows.narrowsPerSchema) * sizeScaleLargest
	const added = (metric: SizeMetric) =>
		(corpora[corpus].series[build].points.at(-1)![metric] -
			corpora.models.series[build].points.at(-1)![metric]) /
		count
	return { raw: added("raw"), gzip: added("gzip"), brotli: added("brotli") }
}

export const sizeScale = {
	/** the commit measured, and each library's version */
	commit: data.commit,
	versions: data.versions,
	/** the schema counts measured */
	scales: data.scales,
	seeds: data.corpora[0].runs.map(run => run.seed),
	corpora,
	/** what one more message, or one more narrow, adds to each build at the largest count */
	marginal: Object.fromEntries(
		sizeBuilds.map(build => [
			build,
			{
				message: marginalOf(build, "messages"),
				narrow: marginalOf(build, "narrows")
			}
		])
	) as Record<SizeBuild, { message: SizeMarginal; narrow: SizeMarginal }>
}

export const sizeCrossoverOf = (
	corpus: SizeCorpusId,
	build: SizeBuild,
	against: SizeBuild,
	metric: SizeMetric
): SizeCrossover =>
	corpora[corpus].crossovers.find(
		crossover =>
			crossover.build === build &&
			crossover.against === against &&
			crossover.metric === metric
	)!

const countText = (n: number) => n.toLocaleString("en-US")

export const typesText = (n: number) =>
	`${countText(n)} ${n === 1 ? "Type" : "Types"}`

export const kbText = (bytes: number) =>
	bytes < 99_950 ?
		`${(bytes / 1000).toFixed(1)} KB`
	:	`${countText(Math.round(bytes / 1000))} KB`

const byteCountText = (bytes: number) =>
	bytes < 100 ? bytes.toFixed(1) : countText(Math.round(bytes))

const bytesText = (bytes: number) => `${byteCountText(bytes)} B`

// a count the data only brackets, to two figures: 4,322 as "4,300"
const aboutText = (n: number) => {
	const unit = 10 ** Math.max(0, Math.floor(Math.log10(n)) - 1)
	return countText(Math.round(n / unit) * unit)
}

// a margin, rounded down where it's a build's lead and up where it trails,
// so neither reads better than it measured
const percentText = (share: number, round: (n: number) => number) => {
	const percent = Math.abs(share) * 100
	return percent < 10 ?
			`${(round(percent * 10) / 10).toFixed(1)}%`
		:	`${round(percent)}%`
}

const listText = (items: string[]): string =>
	items.length < 3 ?
		items.join(" and ")
	:	`${items.slice(0, -1).join(", ")} and ${items.at(-1)}`

/** counts next to each other where a build is the smaller on every seed, the larger on every seed, or either */
type Run = {
	standing: "smaller" | "larger" | "either"
	from: number
	to: number
	/** the least and greatest margin of any seed in it */
	least: number
	most: number
}

/** the first count the page's sentences compare at: an app of one Type is as large as that Type, which each seed draws anew */
export const sizeStandingFrom = 10

const runsOf = ({ margins }: SizeCrossover): Run[] => {
	const runs: Run[] = []
	for (const { schemas, range } of margins) {
		if (schemas < sizeStandingFrom) continue
		const standing =
			range[1] < 0 ? "smaller"
			: range[0] > 0 ? "larger"
			: "either"
		const last = runs.at(-1)
		if (last?.standing === standing) {
			last.to = schemas
			last.least = Math.min(last.least, range[0])
			last.most = Math.max(last.most, range[1])
		} else {
			runs.push({
				standing,
				from: schemas,
				to: schemas,
				least: range[0],
				most: range[1]
			})
		}
	}
	return runs
}

const spanText = ({ from, to }: Run, whole: boolean) =>
	whole ? `every count measured from ${countText(from)} to ${typesText(to)}`
	: from === to ? typesText(from)
	: `${countText(from)} to ${typesText(to)}`

const rangeText = (low: string, high: string) =>
	low === high ? low
	: low === "0.0%" ? `up to ${high}`
	: `${low} to ${high}`

const runText = (run: Run, whole: boolean) =>
	run.standing === "smaller" ?
		`smaller at ${spanText(run, whole)}, by ${rangeText(percentText(run.most, Math.floor), percentText(run.least, Math.floor))}`
	: run.standing === "larger" ?
		`larger at ${spanText(run, whole)}, by ${rangeText(percentText(run.least, Math.ceil), percentText(run.most, Math.ceil))}`
	:	`within ${percentText(Math.max(-run.least, run.most), Math.ceil)} either way at ${spanText(run, whole)}`

/** where a build is smaller than another and where larger, by how much on every seed: "smaller at 1 to 10 Types, by 0.1% to 24%; larger at…" */
export const sizeStandingText = (
	corpus: SizeCorpusId,
	build: SizeBuild,
	against: SizeBuild,
	metric: SizeMetric
): string => {
	const runs = runsOf(sizeCrossoverOf(corpus, build, against, metric))
	return runs.map(run => runText(run, runs.length === 1)).join("; ")
}

// "smaller until about 23, larger until about 130, then smaller". A crossing
// below sizeStandingFrom is between an app of one Type and the next count, so
// it says only which is smaller from there.
const crossingsText = ({
	build,
	crossings: all,
	smallerAtLargest,
	extrapolated
}: SizeCrossover) => {
	const standingOf = (smaller: SizeBuild) =>
		smaller === build ? "smaller" : "larger"
	const crossings = all.filter(({ between }) => between[0] >= sizeStandingFrom)
	const from =
		crossings.length < all.length ? ` from ${countText(sizeStandingFrom)}` : ""
	if (!crossings.length) {
		return `${standingOf(smallerAtLargest)}${from || " at every count"}${
			extrapolated === null ? "" : (
				`; as they grow from ${countText(sizeScaleLargest)}, they'd cross near ${aboutText(extrapolated)}`
			)
		}`
	}
	return [
		...crossings.map(
			({ at, smallerAbove }, i) =>
				`${standingOf(smallerAbove) === "smaller" ? "larger" : "smaller"}${i ? "" : from} until about ${aboutText(at)}`
		),
		`then ${standingOf(smallerAtLargest)}`
	].join(", ")
}

export type SizeTable = {
	header: string[]
	rows: string[][]
}

const shortLabels: Record<SizeBuild, string> = {
	smallest: '"smallest"',
	default: "Default",
	dynamic: "Dynamic",
	valibot: "Valibot",
	zod: "Zod",
	zodMini: "Zod Mini"
}

/** each build's whole bundle at each count, the mean of the seeds */
export const sizeTableOf = (
	corpus: SizeCorpusId,
	metric: SizeMetric
): SizeTable => ({
	header: ["Types", ...sizeBuilds.map(build => shortLabels[build])],
	rows: data.scales.map((schemas, i) => [
		countText(schemas),
		...sizeBuilds.map(build =>
			kbText(corpora[corpus].series[build].points[i][metric])
		)
	])
})

const fitCells = ({ fixed, slope, slopeRange }: SizeFit) => [
	kbText(fixed),
	`${bytesText(slope)} (${rangeText(byteCountText(slopeRange[0]), byteCountText(slopeRange[1]))})`
]

/** each build's fitted line: what it costs before its first Type and what each adds, with the seeds' range */
export const sizeFitTableOf = (corpus: SizeCorpusId): SizeTable => ({
	header: [
		"Build",
		"Fixed, gzip",
		"Each Type, gzip",
		"Fixed, raw",
		"Each Type, raw"
	],
	rows: sizeBuilds.map(build => {
		const { label, fit } = corpora[corpus].series[build]
		return [label, ...fitCells(fit.gzip), ...fitCells(fit.raw)]
	})
})

/** the fits' worst miss of a measured mean, over every corpus, build and metric */
export const sizeFitResidual: number = Math.max(
	...sizeCorpusIds.flatMap(id =>
		sizeBuilds.flatMap(build =>
			sizeMetrics.map(metric => corpora[id].series[build].fit[metric].residual)
		)
	)
)

/** where each precompiled build is the smaller of a pair, by count */
export const sizeCrossoverTableOf = (corpus: SizeCorpusId): SizeTable => ({
	header: ["Build", "Against", "Gzip", "Raw"],
	rows: sizeComparisons.map(([build, against]) => [
		shortLabels[build],
		shortLabels[against],
		crossingsText(sizeCrossoverOf(corpus, build, against, "gzip")),
		crossingsText(sizeCrossoverOf(corpus, build, against, "raw"))
	])
})

/** what a message of its own and a narrow add to each build at the largest count */
export const sizeCostTable: SizeTable = {
	header: [
		"Build",
		"A message, gzip",
		"A message, raw",
		"A narrow, gzip",
		"A narrow, raw"
	],
	rows: sizeBuilds.map(build => {
		const { message, narrow } = sizeScale.marginal[build]
		return [
			sizeBuildLabels[build],
			bytesText(message.gzip),
			bytesText(message.raw),
			bytesText(narrow.gzip),
			bytesText(narrow.raw)
		]
	})
}

const largestOf = (
	corpus: SizeCorpusId,
	build: SizeBuild,
	metric: SizeMetric
) => corpora[corpus].series[build].points.at(-1)![metric]

// how many of something a Type can average before "smallest" gzips larger
// than Valibot at the largest count: its lead on models a Type, over what one
// more costs it than it costs Valibot
const breakEvenOf = (per: "message" | "narrow") =>
	(largestOf("models", "valibot", "gzip") -
		largestOf("models", "smallest", "gzip")) /
	sizeScaleLargest /
	(sizeScale.marginal.smallest[per].gzip - sizeScale.marginal.valibot[per].gzip)

/** the narrows a Type and the messages a Type at which "smallest" and Valibot gzip alike at the largest count, taking each alone */
export const sizeBreakEven = {
	narrows: breakEvenOf("narrow"),
	messages: breakEvenOf("message")
}

const rateText = (rate: number, one: string, many: string) =>
	rate < 1 ?
		`one ${one} in every ${Math.floor(1 / rate)} Types`
	:	`${rate.toFixed(1)} ${many} a Type`

const breakEvenText = (() => {
	const { narrows, messages } = sizeBreakEven
	const lead =
		largestOf("models", "smallest", "gzip") <
		largestOf("models", "valibot", "gzip")
	if (!lead || narrows <= 0 || messages <= 0) {
		return lead ?
				`At ${typesText(sizeScaleLargest)}, a message or a narrow costs "smallest" no more than it costs Valibot, so neither moves which is smaller.`
			:	`At ${typesText(sizeScaleLargest)}, "smallest" gzips larger than Valibot before any message or narrow.`
	}
	return `Taking each alone and adding nothing for the two together, a "smallest" bundle of ${typesText(sizeScaleLargest)} gzips smaller than Valibot's while it has fewer than about ${rateText(narrows, "narrow", "narrows")}, or fewer than about ${rateText(messages, "message", "messages")} and no narrows.`
})()

// which of a precompiled build and dynamic arktype is smaller as Types grow
const dynamicText = (
	corpus: SizeCorpusId,
	build: SizeBuild,
	metric: SizeMetric
) => {
	const crossover = sizeCrossoverOf(corpus, build, "dynamic", metric)
	const { crossings, smallerAtLargest, extrapolated } = crossover
	const ours = corpora[corpus].series[build].fit[metric]
	const dynamic = corpora[corpus].series.dynamic.fit[metric]
	const slopes = `each Type adds ${bytesText(ours.slope)} to it and ${bytesText(dynamic.slope)} to dynamic arktype`
	if (!crossings.length && smallerAtLargest === build) {
		const atLargest = percentText(crossover.margins.at(-1)!.mean, Math.floor)
		return (
			ours.slope <= dynamic.slope ?
				`smaller at every count measured, and ${slopes}, so more Types only widen its lead`
			: extrapolated === null ?
				`smaller at every count measured, by ${atLargest} at ${countText(sizeScaleLargest)}, though ${slopes}, so the two would meet far past what we measured`
			:	`smaller at every count measured, by ${atLargest} at ${countText(sizeScaleLargest)}, though ${slopes}, so as they grow from there the two would meet near ${aboutText(extrapolated)} Types`
		)
	}
	if (crossings.length === 1 && smallerAtLargest === "dynamic") {
		const [{ at, between, seedRange }] = crossings
		return `smaller until about ${aboutText(at)} Types, as ${slopes}: it's the smaller at ${countText(between[0])} and the larger at ${countText(between[1])}, and the seeds' lines cross between ${aboutText(seedRange[0])} and ${aboutText(seedRange[1])}`
	}
	return sizeStandingText(corpus, build, "dynamic", metric)
}

// "at every count measured on models and until about 4,300 Types on forms"
const untilText = (build: SizeBuild, metric: SizeMetric) =>
	listText(
		(["models", "forms"] as const).map(corpus => {
			const { crossings, smallerAtLargest } = sizeCrossoverOf(
				corpus,
				build,
				"dynamic",
				metric
			)
			return (
				!crossings.length && smallerAtLargest === build ?
					`at every count measured on ${corpus}`
				: crossings.length === 1 && smallerAtLargest === "dynamic" ?
					`until about ${aboutText(crossings[0].at)} Types on ${corpus}`
				:	`on ${corpus}, ${sizeStandingText(corpus, build, "dynamic", metric)}`
			)
		})
	)

// a build's cost over another's, rounded down: "4.0x"
const timesText = (ratio: number) =>
	`${(Math.floor(ratio * 10) / 10).toFixed(1)}x`

const costRatio = (per: "message" | "narrow") =>
	sizeScale.marginal.smallest[per].gzip / sizeScale.marginal.valibot[per].gzip

// what a bundle past "smallest"'s crossing with dynamic arktype on forms is,
// or nothing where they don't cross
const outgrownText = (() => {
	const { crossings, smallerAtLargest } = sizeCrossoverOf(
		"forms",
		"smallest",
		"dynamic",
		"gzip"
	)
	return crossings.length === 1 && smallerAtLargest === "dynamic" ?
			`A bundle only outgrows that saving holding about ${aboutText(crossings[0].at)} Types of forms at once. A frontend that large is split by route, so a page loads the runtime and the validators its own chunks import, where arktype's parser sits in the first chunk any page loads. What loads thousands of Types at once is a server, and nothing downloads a server.`
		:	""
})()

const shareText = (share: number | undefined) =>
	`${Math.round((share ?? 0) * 100)}%`

const formsOptions = data.corpora.find(corpus => corpus.id === "forms")!.options

const fixedText = (corpus: SizeCorpusId, build: SizeBuild) =>
	kbText(corpora[corpus].series[build].points[0].gzip)

/** the page's sentences, each stating what the data does */
export const sizeTexts = {
	method: `Each app is modules of ${data.perModule} Types, no two alike, written the same way in each library and bundled whole by esbuild ${data.versions.esbuild}, tree-shaken and minified, with ArkType ${data.versions.arktype} (${data.commit}), Valibot ${data.versions.valibot} and Zod ${data.versions.zod}. Every number is the mean of ${sizeScale.seeds.length} apps generated from different seeds.`,
	range: `${countText(data.scales[0])} to ${typesText(sizeScaleLargest)}`,
	formsRates: `${shareText(formsOptions.messages)} of their fields that aren't references or arrays have a message of their own and ${shareText(formsOptions.narrows)} of their plain strings and integers a narrow, about ${corpora.forms.messagesPerSchema.toFixed(1)} messages and ${corpora.forms.narrowsPerSchema.toFixed(1)} narrows a Type`,
	fixed: `With one Type of a model, the "smallest" build gzips to ${fixedText("models", "smallest")} and the default build to ${fixedText("models", "default")}, where dynamic arktype is ${fixedText("models", "dynamic")}, Valibot ${fixedText("models", "valibot")}, Zod Mini ${fixedText("models", "zodMini")} and Zod ${fixedText("models", "zod")}.`,
	fitNote: `Each line is fitted to the counts from ${countText(sizeFitFrom)} Types up, where growth is steady, and is within ${percentText(sizeFitResidual, Math.ceil)} of every mean it's fitted to. The range after each Type's bytes is the seeds', each fitted alone.`,
	modelsValibot: `Against Valibot on models, "smallest" gzips ${sizeStandingText("models", "smallest", "valibot", "gzip")}. In raw bytes it's ${sizeStandingText("models", "smallest", "valibot", "raw")}.`,
	formsValibot: `On forms, "smallest" gzips ${sizeStandingText("forms", "smallest", "valibot", "gzip")}. In raw bytes it's ${sizeStandingText("forms", "smallest", "valibot", "raw")}.`,
	messagesValibot: `With messages alone, "smallest" gzips ${sizeStandingText("messages", "smallest", "valibot", "gzip")}. With narrows alone, it gzips ${sizeStandingText("narrows", "smallest", "valibot", "gzip")}.`,
	modelsDynamic: `On models, "smallest" gzips ${dynamicText("models", "smallest", "gzip")}. The default build gzips ${dynamicText("models", "default", "gzip")}.`,
	formsDynamic: `On forms, "smallest" gzips ${dynamicText("forms", "smallest", "gzip")}. In raw bytes it's ${dynamicText("forms", "smallest", "raw")}. The default build gzips ${dynamicText("forms", "default", "gzip")}.`,
	brotli: `Compressed with brotli, "smallest" on models is ${sizeStandingText("models", "smallest", "valibot", "brotli")}. On forms it's ${sizeStandingText("forms", "smallest", "valibot", "brotli")}.`,
	smallestUntil: `Built "smallest", a bundle gzips smaller than it would shipping arktype ${untilText("smallest", "gzip")}.`,
	defaultUntil: `The default build gzips smaller than dynamic arktype ${untilText("default", "gzip")}, and in raw bytes ${untilText("default", "raw")}.`,
	costs: `At ${typesText(sizeScaleLargest)}, a message adds ${bytesText(sizeScale.marginal.smallest.message.gzip)} gzipped to a "smallest" bundle and ${bytesText(sizeScale.marginal.valibot.message.gzip)} to Valibot's, and a narrow adds ${bytesText(sizeScale.marginal.smallest.narrow.gzip)} and ${bytesText(sizeScale.marginal.valibot.narrow.gzip)}.`,
	breakEven: breakEvenText,
	costRatios: `Gzipped, a narrow costs a "smallest" bundle ${timesText(costRatio("narrow"))} what it costs Valibot's, and a message ${timesText(costRatio("message"))}.`,
	outgrown: outgrownText
} as const

export type SizeTextId = keyof typeof sizeTexts
