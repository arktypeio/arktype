/**
 * Bundle size as an app's Types grow, for the homepage's size drill-down:
 * per corpus, each arm's gzipped bytes at each scale, and where ArkType's
 * builds are the smaller one. The chart, its table and its cutoff lines read
 * only `sizeCurves`.
 *
 * A corpus is one kind of schema, measured at several scales. What a
 * library ships per schema depends on what the schema holds, so a result on
 * one corpus says nothing about another: Types with a message on a third of
 * their fields are a different corpus from Types with none.
 *
 * The data is the size-at-scale measurement's (lib/bench/sizeScale.ts,
 * `pnpm benchSizeScale`): the mean of its seeds at each count, and its own
 * sentence for each standing, which carries the seeds' range.
 */
import {
	sizeScale,
	sizeStandingText,
	sizeTexts,
	type SizeBuild,
	type SizeCorpusId
} from "./sizeScale.ts"

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

type BuildArm = CurveArm & { id: SizeBuild }

const arms: BuildArm[] = [
	{ id: "dynamic", label: "ArkType, dynamic", kind: "dynamic", line: "dotted" },
	{ id: "zod", label: "Zod 4", kind: "other", line: "solid" },
	{ id: "zodMini", label: "Zod Mini", kind: "other", line: "dotted" },
	{
		id: "default",
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

const source = `synthetic apps of distinct Types, written alike in each library and bundled whole by esbuild, tree-shaken and minified; each number is the mean of ${sizeScale.seeds.length} apps generated from different seeds`

type CorpusText = {
	id: SizeCorpusId
	label: string
	scope: string
}

const corpusOf = ({ id, label, scope }: CorpusText): CurveCorpus => ({
	id,
	label,
	source,
	scope,
	arms,
	points: sizeScale.scales.map((types, i) => ({
		types,
		gz: Object.fromEntries(
			arms.map(arm => [
				arm.id,
				sizeScale.corpora[id].series[arm.id].points[i].gzip
			])
		)
	})),
	cutoffs: arms
		.filter(arm => arm.kind === "default" || arm.kind === "smallest")
		.flatMap(ours =>
			arms
				.filter(arm => arm.kind === "other")
				.map(rival => ({
					ours,
					rival,
					where: sizeStandingText(id, ours.id, rival.id, "gzip")
				}))
		)
})

export const sizeCurves: SizeCurves = {
	commit: sizeScale.commit,
	corpora: [
		corpusOf({
			id: "models",
			label: "Data models",
			scope:
				"These Types have no message or narrow of their own, as an API's models don't. Forms, below, are a separate corpus, and a result here doesn't carry over to it."
		}),
		corpusOf({
			id: "forms",
			label: "Forms",
			scope: `In these Types, ${sizeTexts.formsRates}. A result here doesn't carry over to models, above.`
		})
	]
}
