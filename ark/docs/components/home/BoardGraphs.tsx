import Link from "next/link"
import { Fragment, type CSSProperties } from "react"
import { wellKnownRule } from "../../lib/bench/leaderboard.ts"
import { pickThreeTable, tieMargin } from "../../lib/claims.ts"
import { ClaimText } from "../mdx/Claim.tsx"
import {
	boardGraphs,
	methodHref,
	multiple,
	type BoardBar,
	type BoardGraph
} from "./boardFacts.ts"

/**
 * How many multiples of the best result a graph's axis spans. Every graph
 * shares it, so a bar is the same length for the same average in all three,
 * and ArkType sits at the 1× line in each. An average past it is drawn to
 * the end of the track and cut: its number, printed beside it, is its
 * length, and the bar doesn't pretend to be.
 */
const axis = 4

const ticks = Array.from({ length: axis }, (_, i) => i + 1)

type LaneProps = {
	bar: BoardBar
	/** its row in the graph, for the order the bars arrive in */
	row: number
}

const Lane = ({ bar, row }: LaneProps) => {
	const cut = bar.score > axis
	return (
		<li
			className={`graph-lane is-${bar.kind}${cut ? " is-cut" : ""}${bar.wide ? " is-wide" : ""}`}
			style={
				{
					"--w": Math.min(bar.score, axis) / axis,
					"--row": row
				} as CSSProperties
			}
		>
			<span className="graph-place">{bar.place}</span>
			<span className="graph-name">{bar.library}</span>
			<span className="graph-val">
				{multiple(bar.score)}
				{cut && <span className="vh">, past the end of the axis</span>}
			</span>
			<span className="graph-track" aria-hidden>
				<span className="graph-bar" />
			</span>
		</li>
	)
}

type GraphProps = {
	graph: BoardGraph
}

const Graph = ({ graph }: GraphProps) => (
	<div className="graph">
		<h4>{graph.title}</h4>
		<p className="graph-of">
			{graph.results} results · {graph.ranked} libraries ranked
		</p>
		<ol>
			{graph.bars.map((bar, row) => (
				<Fragment key={bar.library}>
					{
						// between the last rival drawn and Zod: said, not drawn
						bar.kind === "incumbent" && graph.skipped.narrow > 0 && (
							<li
								className={
									graph.skipped.wide ? "graph-gap" : "graph-gap is-narrow"
								}
							>
								<span className="gap-wide">{graph.skipped.wide}</span>
								<span className="gap-narrow">{graph.skipped.narrow}</span> more
								between
							</li>
						)
					}
					<Lane bar={bar} row={row} />
				</Fragment>
			))}
		</ol>
		<div className="graph-axis" aria-hidden>
			{ticks.map(tick => (
				<span key={tick} style={{ "--x": tick / axis } as CSSProperties}>
					{tick}×
				</span>
			))}
		</div>
		{graph.id === "startup" && pickThreeTable.startupNote && (
			<p className="graph-note">{pickThreeTable.startupNote}</p>
		)}
	</div>
)

/**
 * The board: a graph a category, ArkType first in each. Under it in every
 * graph are the best of the other libraries the site names and, wherever it
 * places, Zod, since that is the library most readers are deciding against.
 * The bars are averages from lib/bench/leaderboard.ts on one axis; the
 * table of the same numbers is the drill-down beside it.
 */
export const BoardGraphs = () => (
	<figure
		className="graphs"
		id="graphs"
		data-stage="graphs"
		aria-labelledby="graphs-title"
	>
		<figcaption className="graphs-head">
			<h3 id="graphs-title">
				<ClaimText claim={pickThreeTable.title} />
			</h3>
			<p>Average multiple of the best result. Shorter is better.</p>
		</figcaption>
		<div className="graphs-row">
			{boardGraphs().map(graph => (
				<Graph key={graph.id} graph={graph} />
			))}
		</div>
		<p className="graphs-foot">
			<span>1st: the best average, or within {tieMargin} of it</span>
			<span>
				<span className="graph-cut-key" aria-hidden /> past {axis}×: the bar is
				cut, the number is exact
			</span>
			<span>libraries with {wellKnownRule} drawn, every library ranked</span>
			<Link href={methodHref}>how we measured →</Link>
		</p>
	</figure>
)
