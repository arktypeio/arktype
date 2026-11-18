import { Fragment, type CSSProperties, type ReactNode } from "react"
import { claims, draftOf, isPending, leadsEvery } from "../../lib/claims.ts"

const pickTwo = "Pick 2."

/** the title's sentences, the trade-off it ends struck out before "Pick 3" */
const titlePhrases = () => {
	const phrases = draftOf(claims.boardTitle).split(/(?<=\.) /)
	return leadsEvery ?
			[...phrases.slice(0, -1), pickTwo, ...phrases.slice(-1)]
		:	phrases
}

/** the board's title, a phrase at a time, "Pick 2." struck out as it lands */
export const BoardTitle = () => (
	<span
		className={
			isPending(claims.boardTitle) ? "board-title pending-claim" : "board-title"
		}
	>
		{titlePhrases().map((phrase, i) => (
			<Fragment key={phrase}>
				{i > 0 && " "}
				<span
					className="phrase"
					style={{ "--i": i } as CSSProperties}
					aria-hidden={phrase === pickTwo || undefined}
				>
					{phrase === pickTwo ?
						<s>{phrase}</s>
					:	phrase}
				</span>
			</Fragment>
		))}
	</span>
)

export type BoardProps = {
	/** false where the hero already carries the title */
	titled: boolean
	/** the proof of the title: a graph a category */
	table: ReactNode
	/** the board's drill-downs */
	children: ReactNode
}

/**
 * "Pick 3", and the graphs that back it: each category's best averages,
 * ArkType first in each. The same numbers as a table are the drill-down
 * passed as `children`.
 */
export const Board = ({ titled, table, children }: BoardProps) => (
	<section
		className={titled ? "board" : "board is-untitled"}
		id="board"
		aria-labelledby={titled ? "board-title" : undefined}
		aria-label={titled ? undefined : draftOf(claims.boardTitle)}
	>
		{titled && (
			<div className="board-head" data-board>
				<h2 id="board-title">
					<BoardTitle />
				</h2>
			</div>
		)}
		{table}
		{children}
	</section>
)
