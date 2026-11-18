import {
	kbText,
	sizeBuilds,
	sizeCostTable,
	sizeCrossoverTableOf,
	sizeFitTableOf,
	sizeScale,
	sizeScaleLargest,
	sizeTableOf,
	sizeTexts,
	typesText,
	type SizeBuild,
	type SizeCorpusId,
	type SizeMetric,
	type SizeTable,
	type SizeTextId
} from "../../lib/bench/sizeScale.ts"
import { Table } from "./Table.tsx"

type SizeTextProps = { id: SizeTextId }

/** a sentence lib/bench/sizeScale.ts writes from its data, inline in a paragraph */
export const SizeScaleText = ({ id }: SizeTextProps) => <>{sizeTexts[id]}</>

/** one as a paragraph of its own, or nothing where the data leaves it nothing to say */
export const SizeScaleParagraph = ({ id }: SizeTextProps) =>
	sizeTexts[id] ? <p>{sizeTexts[id]}</p> : null

type DataTableProps = { table: SizeTable }

const DataTable = ({ table: { header, rows } }: DataTableProps) => (
	<Table>
		<thead>
			<tr>
				{header.map(cell => (
					<th key={cell}>{cell}</th>
				))}
			</tr>
		</thead>
		<tbody>
			{rows.map(row => (
				<tr key={row.slice(0, 2).join()}>
					{row.map((cell, i) => (
						<td key={i}>{cell}</td>
					))}
				</tr>
			))}
		</tbody>
	</Table>
)

type CorpusProps = { corpus: SizeCorpusId }

type SizeTableProps = CorpusProps & { metric: SizeMetric }

/** each build's whole bundle at each count of Types */
export const SizeScaleTable = ({ corpus, metric }: SizeTableProps) => (
	<DataTable table={sizeTableOf(corpus, metric)} />
)

/** each build's fitted line: its fixed bytes and what each Type adds */
export const SizeScaleFits = ({ corpus }: CorpusProps) => (
	<DataTable table={sizeFitTableOf(corpus)} />
)

/** where each precompiled build is the smaller of a pair */
export const SizeScaleCrossovers = ({ corpus }: CorpusProps) => (
	<DataTable table={sizeCrossoverTableOf(corpus)} />
)

/** what a message and a narrow add to each build */
export const SizeScaleCosts = () => <DataTable table={sizeCostTable} />

const width = 640
const height = 340
const plot = { left: 58, right: 14, top: 12, bottom: 34 }

/** each build's library, which its line's color follows, and the dashes telling a library's builds apart */
const strokes: Record<SizeBuild, { library: string; dash?: string }> = {
	smallest: { library: "arktype" },
	default: { library: "arktype", dash: "7 5" },
	dynamic: { library: "arktype", dash: "1.5 5" },
	valibot: { library: "valibot" },
	zod: { library: "zod" },
	zodMini: { library: "zod", dash: "7 5" }
}

// a step of 1, 2 or 5 times a power of ten giving about four gridlines
const stepOf = (max: number) => {
	const unit = 10 ** Math.floor(Math.log10(max / 4))
	return unit * ([1, 2, 5, 10].find(times => max / (times * unit) <= 5) ?? 10)
}

const chartTitles: Record<SizeCorpusId, string> = {
	models: "Models",
	messages: "Messages",
	narrows: "Narrows",
	forms: "Forms"
}

/**
 * Each build's gzipped bundle as an app's Types grow. The axis tops out at the
 * largest bundle that isn't the default build's, whose line would flatten the
 * others, so that one is clipped and the caption says where it ends.
 */
export const SizeScaleChart = ({ corpus }: CorpusProps) => {
	const { series } = sizeScale.corpora[corpus]
	const top = Math.max(
		...sizeBuilds
			.filter(build => build !== "default")
			.map(build => series[build].points.at(-1)!.gzip)
	)
	const step = stepOf(top)
	const max = Math.ceil(top / step) * step
	const x = (schemas: number) =>
		plot.left + (schemas / sizeScaleLargest) * (width - plot.left - plot.right)
	const y = (bytes: number) =>
		height - plot.bottom - (bytes / max) * (height - plot.top - plot.bottom)
	const clip = `size-chart-clip-${corpus}`
	const defaultLargest = series.default.points.at(-1)!.gzip
	return (
		<figure className="size-chart">
			<figcaption>
				<span className="cc-title">{chartTitles[corpus]}</span>
				<span className="cc-unit">whole bundle, gzipped</span>
			</figcaption>
			<svg
				viewBox={`0 0 ${width} ${height}`}
				role="img"
				aria-label={`Each build's gzipped bundle on ${corpus}, from 1 to ${typesText(sizeScaleLargest)}. The table below has every number.`}
			>
				<defs>
					<clipPath id={clip}>
						<rect
							x={plot.left}
							y={plot.top - 2}
							width={width - plot.left - plot.right + 4}
							height={height - plot.top - plot.bottom + 4}
						/>
					</clipPath>
				</defs>
				{Array.from({ length: max / step + 1 }, (_, i) => i * step).map(
					bytes => (
						<g key={bytes}>
							<line
								className="sc-grid"
								x1={plot.left}
								x2={width - plot.right}
								y1={y(bytes)}
								y2={y(bytes)}
							/>
							<text className="sc-tick" x={plot.left - 8} y={y(bytes) + 4}>
								{bytes ? kbText(bytes) : "0"}
							</text>
						</g>
					)
				)}
				{sizeScale.scales
					.filter(schemas => schemas >= sizeScaleLargest / 5)
					.map(schemas => (
						<text
							key={schemas}
							className={
								schemas === sizeScaleLargest ? "sc-tick" : "sc-tick sc-tick-x"
							}
							x={x(schemas)}
							y={height - plot.bottom + 18}
						>
							{schemas.toLocaleString("en-US")}
						</text>
					))}
				<text
					className="sc-tick sc-axis"
					x={plot.left}
					y={height - plot.bottom + 18}
				>
					Types
				</text>
				<g clipPath={`url(#${clip})`}>
					{sizeBuilds.map(build => (
						<g key={build} className={`sc-${strokes[build].library}`}>
							<polyline
								className="sc-line"
								strokeDasharray={strokes[build].dash}
								points={series[build].points
									.map(point => `${x(point.schemas)},${y(point.gzip)}`)
									.join(" ")}
							/>
							{series[build].points.map(point => (
								<circle
									key={point.schemas}
									className="sc-dot"
									cx={x(point.schemas)}
									cy={y(point.gzip)}
									r={3}
								>
									<title>{`${series[build].label}, ${typesText(point.schemas)}: ${kbText(point.gzip)}`}</title>
								</circle>
							))}
						</g>
					))}
				</g>
			</svg>
			<ul className="sc-legend">
				{sizeBuilds.map(build => (
					<li key={build} className={`sc-${strokes[build].library}`}>
						<svg viewBox="0 0 28 8" aria-hidden="true">
							<line
								className="sc-line"
								x1={1}
								x2={27}
								y1={4}
								y2={4}
								strokeDasharray={strokes[build].dash}
							/>
						</svg>
						{series[build].label}
					</li>
				))}
			</ul>
			{defaultLargest > max && (
				<p className="sc-note">
					The default build's line leaves the chart: it's{" "}
					{kbText(defaultLargest)} at {typesText(sizeScaleLargest)}.
				</p>
			)}
		</figure>
	)
}
