import type { ReactNode } from "react"
import { claims, draftOf, leadsEvery } from "../../lib/claims.ts"

/**
 * The board's heading and the line under it, here alone so the copy changes
 * in one place. The heading names the categories and states nothing about
 * them.
 */
export const boardHeading = "Speed. Size. Startup."

/**
 * "Zero compromises" says ArkType gives up none of the three, so it is the
 * line only while lib/claims.ts lets ArkType claim all three by the board's
 * rule. Otherwise the line is claims.ts's own title for the board, which
 * words only the categories ArkType leads.
 */
export const boardSubtitle =
	leadsEvery ? "Three metrics. Zero compromises." : draftOf(claims.boardTitle)

export type BoardProps = {
	/** the graphs under the heading: a graph a category */
	graphs: ReactNode
	/** the board's drill-downs */
	children: ReactNode
}

/**
 * The board: its heading, then each category's geometric means as a graph,
 * ArkType first in each. The same numbers as a table are the drill-down
 * passed as `children`.
 */
export const Board = ({ graphs, children }: BoardProps) => (
	<section className="board" id="board" aria-labelledby="board-title">
		<div className="board-head">
			<h2 id="board-title">{boardHeading}</h2>
			<p className="board-sub">{boardSubtitle}</p>
		</div>
		{graphs}
		{children}
	</section>
)
