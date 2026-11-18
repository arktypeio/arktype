import type { CSSProperties } from "react"
import type { CurveArm, CurveCorpus } from "../../lib/bench/sizeCurves.ts"

/** "2.60 kB", "51.5 kB", "114 kB", "5.69 MB" */
const kb = (bytes: number) =>
	bytes < 999_500 ?
		`${(bytes / 1000).toPrecision(3)} kB`
	:	`${(bytes / 1_000_000).toPrecision(3)} MB`

const typesText = (types: number) => types.toLocaleString("en-US")

/** a share of the plot as a CSS percentage */
const pct = (share: number) => `${(share * 100).toFixed(2)}%`

/** powers of ten and their 2 and 5 multiples spanning a range, for a log axis */
const logTicks = (min: number, max: number) => {
	const ticks: number[] = []
	for (
		let power = 10 ** Math.floor(Math.log10(min));
		power <= max;
		power *= 10
	) {
		for (const step of [1, 2, 5])
			if (power * step >= min && power * step <= max) ticks.push(power * step)
	}
	return ticks
}

/** the least a share of the plot's width two scale labels may sit apart on a phone */
const tickGap = 0.14

/**
 * The scales whose labels a narrow plot drops: working back from the
 * largest, any within `tickGap` of the last one kept
 */
const tightTicks = (xs: number[]) => {
	const tight = new Set<number>()
	let kept = Infinity
	for (const x of [...xs].reverse()) {
		if (kept - x < tickGap) tight.add(x)
		else kept = x
	}
	return tight
}

/** the least a share of the plot's height two end labels may sit apart */
const labelGap = 0.075

/**
 * Each line's label beside its last point, pushed apart where two lines end
 * together: sorted by height, each takes its own place or the nearest below
 * the one above it
 */
const spreadLabels = (ends: { id: string; y: number }[]) => {
	const placed = new Map<string, number>()
	let floor = -Infinity
	for (const end of [...ends].sort((l, r) => l.y - r.y)) {
		const y = Math.max(end.y, floor + labelGap)
		placed.set(end.id, y)
		floor = y
	}
	return placed
}

type ScalePlot = {
	arms: {
		arm: CurveArm
		/** each measured point, as shares of the plot from its top left */
		dots: { types: number; bytes: number; x: number; y: number }[]
	}[]
	xTicks: { types: number; x: number; tight: boolean }[]
	yTicks: { bytes: number; y: number }[]
	labels: Map<string, number>
}

const plotOf = ({ arms, points }: CurveCorpus): ScalePlot => {
	const bytes = points.flatMap(point => Object.values(point.gz))
	const [lo, hi] = [Math.min(...bytes) / 1.25, Math.max(...bytes) * 1.25]
	const [first, last] = [points[0].types, points.at(-1)!.types]
	const x = (types: number) => Math.log(types / first) / Math.log(last / first)
	const y = (value: number) => 1 - Math.log(value / lo) / Math.log(hi / lo)
	const tight = tightTicks(points.map(point => x(point.types)))
	const plotted = arms.map(arm => ({
		arm,
		dots: points
			.filter(point => arm.id in point.gz)
			.map(point => ({
				types: point.types,
				bytes: point.gz[arm.id],
				x: x(point.types),
				y: y(point.gz[arm.id])
			}))
	}))
	return {
		arms: plotted,
		xTicks: points.map(point => ({
			types: point.types,
			x: x(point.types),
			tight: tight.has(x(point.types))
		})),
		yTicks: logTicks(lo, hi).map(value => ({ bytes: value, y: y(value) })),
		labels: spreadLabels(
			plotted.map(({ arm, dots }) => ({ id: arm.id, y: dots.at(-1)!.y }))
		)
	}
}

export type SizeCurveChartProps = {
	corpus: CurveCorpus
	/** the commit it was measured at */
	commit: string
}

/**
 * Gzipped bundle size against the number of Types an app defines, both on
 * log axes, a line per library and per ArkType build. Then every byte as a
 * table, and each build's cutoffs: the scales it is the smaller at, on this
 * corpus alone. Reads only its `corpus`, so new data needs no change here.
 */
export const SizeCurveChart = ({ corpus, commit }: SizeCurveChartProps) => {
	const plot = plotOf(corpus)
	return (
		<figure className="scale">
			<h3 className="scale-title">{corpus.label}</h3>
			<div className="scale-key" aria-hidden>
				{corpus.arms.map(arm => (
					<span key={arm.id} className={`is-${arm.kind} is-${arm.line}`}>
						<i />
						{arm.label}
					</span>
				))}
			</div>
			<div
				className="scale-plot"
				role="img"
				aria-label={`Gzipped bundle size as an app grows from ${typesText(corpus.points[0].types)} to ${typesText(corpus.points.at(-1)!.types)} Types, on log axes. Every value is in the table below.`}
			>
				{plot.yTicks.map(tick => (
					<span
						key={tick.bytes}
						className="scale-y"
						style={{ "--y": pct(tick.y) } as CSSProperties}
					>
						{kb(tick.bytes).replace(".00", "").replace(/\.0 /, " ")}
					</span>
				))}
				<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
					{plot.yTicks.map(tick => (
						<line
							key={tick.bytes}
							x1="0"
							x2="100"
							y1={(tick.y * 100).toFixed(2)}
							y2={(tick.y * 100).toFixed(2)}
						/>
					))}
					{plot.arms.map(({ arm, dots }) => (
						<polyline
							key={arm.id}
							className={`is-${arm.kind} is-${arm.line}`}
							points={dots
								.map(
									dot =>
										`${(dot.x * 100).toFixed(2)},${(dot.y * 100).toFixed(2)}`
								)
								.join(" ")}
						/>
					))}
				</svg>
				{plot.arms.map(({ arm, dots }) =>
					dots.map(dot => (
						<span
							key={`${arm.id} ${dot.types}`}
							className={`scale-dot is-${arm.kind}`}
							style={{ "--x": pct(dot.x), "--y": pct(dot.y) } as CSSProperties}
							title={`${arm.label}, ${typesText(dot.types)} Types: ${kb(dot.bytes)}`}
						/>
					))
				)}
				{plot.arms.map(({ arm }) => (
					<span
						key={arm.id}
						className={`scale-end is-${arm.kind}`}
						style={{ "--y": pct(plot.labels.get(arm.id)!) } as CSSProperties}
					>
						{arm.label}
					</span>
				))}
				{plot.xTicks.map(tick => (
					<span
						key={tick.types}
						className={tick.tight ? "scale-x is-tight" : "scale-x"}
						style={{ "--x": pct(tick.x) } as CSSProperties}
					>
						{typesText(tick.types)}
					</span>
				))}
			</div>
			<p className="scale-axis">
				Types in the app · gzipped bundle · log scales
			</p>
			<div className="scale-rows">
				<table className="scale-table">
					<thead>
						<tr>
							<th scope="col">gzipped, by Types</th>
							{corpus.points.map(point => (
								<th key={point.types} scope="col">
									{typesText(point.types)}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{corpus.arms.map(arm => (
							<tr key={arm.id} className={`is-${arm.kind}`}>
								<th scope="row">{arm.label}</th>
								{corpus.points.map(point => (
									<td key={point.types}>
										{arm.id in point.gz ? kb(point.gz[arm.id]) : "—"}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<p className="scale-scope">
				<b>On this corpus only.</b> {corpus.scope}
			</p>
			<ul className="cutoffs">
				{corpus.cutoffs.map(({ ours, rival, where }) => (
					<li key={`${ours.id} ${rival.id}`} className={`is-${ours.kind}`}>
						<span className="cut-pair">
							<b>{ours.label}</b> against {rival.label}
						</span>
						<span className="cut-where">{where}</span>
					</li>
				))}
			</ul>
			<figcaption>
				{corpus.source[0].toUpperCase()}
				{corpus.source.slice(1)}, at {commit}.
			</figcaption>
		</figure>
	)
}
