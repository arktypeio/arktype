import type { ReactNode } from "react"

/**
 * The board's heading and the line under it, here alone so the copy changes
 * in one place. Neither states a number or a rank, so neither is a claim
 * lib/claims.ts has to guard.
 */
export const boardHeading = "Speed. Size. Startup."

export const boardSubtitle = "Three metrics. Zero compromises."

export type BoardProps = {
	/** the graphs under the heading: a graph a category */
	graphs: ReactNode
	/** the board's drill-downs */
	children: ReactNode
}

/**
 * The board: its heading, then each category's best averages as a graph,
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
