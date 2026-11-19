import Link from "next/link"
import { Fragment, type CSSProperties } from "react"
import { standingsAsOf } from "../../lib/claims.ts"
import {
	boardGraphs,
	methodHref,
	type BoardBar,
	type BoardGraph
} from "./boardFacts.ts"

/** lib/claims.ts's date line as the footer's other notes are written: "standings as of November 6, 2026" */
const asOf = standingsAsOf.text
	.replace(/\.$/, "")
	.replace(/^./, first => first.toLowerCase())

type GapProps = {
	bar: BoardBar
}

/** the libraries that place between two lanes: said, not drawn */
const Gap = ({ bar }: GapProps) => {
	const { wide, narrow } = bar.gap
	if (!wide && !narrow) return null
	return (
		<li
			className={
				bar.wide ? "graph-gap is-wide"
				: wide ?
					"graph-gap"
				:	"graph-gap is-narrow"
			}
		>
			<span className="gap-wide">{wide}</span>
			<span className="gap-narrow">{narrow}</span> more between
		</li>
	)
}

type LaneProps = {
	bar: BoardBar
	/** its row in the graph, for the order the bars arrive in */
	row: number
}

const Lane = ({ bar, row }: LaneProps) => (
	<li
		className={`graph-lane is-${bar.kind}${bar.cut ? " is-cut" : ""}${bar.wide ? " is-wide" : ""}`}
		style={{ "--w": bar.w, "--row": row } as CSSProperties}
	>
		<span className="graph-place">{bar.place}</span>
		<span className="graph-name">{bar.library}</span>
		<span className="graph-val">
			{bar.beside && <span className="graph-beside">{bar.beside}</span>}
			{bar.text}
			{bar.cut && <span className="vh">, past the end of the axis</span>}
		</span>
		<span className="graph-track" aria-hidden>
			<span className="graph-bar" />
		</span>
		{bar.sub && <span className="graph-sub">{bar.sub}</span>}
	</li>
)

type GraphProps = {
	graph: BoardGraph
}

const Graph = ({ graph }: GraphProps) => (
	<div className="graph" style={{ "--mark": graph.mark } as CSSProperties}>
		<h4>{graph.title}</h4>
		<p className="graph-of">{graph.caption}</p>
		<ol>
			{graph.bars.map((bar, row) => (
				<Fragment key={bar.library}>
					<Gap bar={bar} />
					<Lane bar={bar} row={row} />
				</Fragment>
			))}
		</ol>
		<div className="graph-axis" aria-hidden>
			{graph.ticks.map(tick => (
				<span key={tick.at} style={{ "--x": tick.at } as CSSProperties}>
					{tick.label}
				</span>
			))}
		</div>
		<p className="graph-badge">
			<span className="graph-badge-place">{graph.badge.place}</span>
			<span>{graph.badge.text}</span>
		</p>
	</div>
)

/**
 * The board: a graph a category, each in the unit its results were measured
 * in. The results are other projects' benchmarks, the bars and places
 * lib/bench/units.ts's, and under each graph is ArkType's place across every
 * result of its category. The same numbers as a table are the drill-down
 * beside it, and how each was measured is a link away.
 */
export const BoardGraphs = () => (
	<figure
		className="graphs"
		id="graphs"
		data-stage="graphs"
		data-idle=""
		aria-labelledby="board-title"
	>
		<figcaption className="graphs-head">
			Other projects' benchmarks, in the units they measure. Shorter is better.
		</figcaption>
		<div className="graphs-row">
			{boardGraphs().map(graph => (
				<Graph key={graph.id} graph={graph} />
			))}
		</div>
		<p className="graphs-foot">
			<span>
				<span className="graph-cut-key" aria-hidden /> past the axis: the bar is
				cut, the number is exact
			</span>
			<span>ArkType precompiled, default build, in all three</span>
			<span className="graphs-method">
				<time dateTime={standingsAsOf.date}>{asOf}</time>
				<Link href={methodHref}>how we measured →</Link>
			</span>
		</p>
	</figure>
)
