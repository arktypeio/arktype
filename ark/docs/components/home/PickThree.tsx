import type { CSSProperties } from "react"
import { averageText, pickThreeTable, tieMargin } from "../../lib/claims.ts"
import { ClaimText } from "../mdx/Claim.tsx"
import { CheckIcon } from "./icons.tsx"

/** an average as a multiple of the best result: "1.252×", "19.7×", "13.8k×" */
const multiple = (score: number) =>
	score < 10 ? `${averageText(score)}×`
	: score < 1e3 ? `${score.toPrecision(3)}×`
	: score < 1e6 ? `${(score / 1e3).toPrecision(3)}k×`
	: `${(score / 1e6).toPrecision(3)}M×`

/** ArkType's marks land last, after every other row's */
const markDelay = (row: number, column: number) =>
	row === 0 ? 0.75 + column * 0.22 : 0.3 + row * 0.06

/** each library's best average in every category, marked where it counts as first */
export const PickThree = () => (
	<figure className="p3" id="pick3" aria-labelledby="pick3-title" data-pick3>
		<figcaption className="p3-head">
			<h3 id="pick3-title">
				<ClaimText claim={pickThreeTable.title} />
			</h3>
			<p>
				Each library's best average, as a multiple of the best result. Lower is
				better. {pickThreeTable.shown}
			</p>
			{pickThreeTable.startupNote && (
				<p className="p3-startup">{pickThreeTable.startupNote}</p>
			)}
		</figcaption>
		<table className="p3-table">
			<thead>
				<tr>
					<th scope="col">library</th>
					{pickThreeTable.categories.map(category => (
						<th
							key={category.id}
							scope="col"
							title={
								category.id === "startup" && pickThreeTable.startupNote ?
									`${category.label}: ${pickThreeTable.startupNote}`
								:	category.label
							}
						>
							{category.id}
						</th>
					))}
				</tr>
			</thead>
			<tbody>
				{pickThreeTable.rows.map((row, r) => (
					<tr
						key={row.library}
						className={r === 0 ? "is-ours" : undefined}
						style={{ "--r": r } as CSSProperties}
					>
						<th scope="row">{row.library}</th>
						{pickThreeTable.categories.map((category, c) => {
							const cell = row.cells[category.id]
							return (
								<td
									key={category.id}
									className={cell?.first ? "is-first" : undefined}
									style={{ "--at": `${markDelay(r, c)}s` } as CSSProperties}
								>
									{cell ?
										<span className="p3-cell">
											{cell.first && (
												<span className="p3-mark" aria-label="first">
													<CheckIcon />
												</span>
											)}
											{multiple(cell.score)}
										</span>
									:	<span className="p3-none" aria-label="not ranked">
											—
										</span>
									}
								</td>
							)
						})}
					</tr>
				))}
			</tbody>
		</table>
		<p className="p3-foot">
			<span className="p3-key">
				<span className="p3-mark" aria-hidden>
					<CheckIcon />
				</span>
				first: the best average, or within {tieMargin} of it
			</span>
			<span>— not ranked: in under half its benchmarks</span>
			<a href="#board-note">how we measured ↑</a>
		</p>
	</figure>
)
