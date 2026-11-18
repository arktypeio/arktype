import Link from "next/link"
import type { CSSProperties } from "react"
import { pickThreeTable, tieMargin } from "../../lib/claims.ts"
import { methodHref, multiple } from "./boardFacts.ts"
import { CheckIcon } from "./icons.tsx"

/** ArkType's marks land last, after every other row's */
const markDelay = (row: number, column: number) =>
	row === 0 ? 0.75 + column * 0.22 : 0.3 + row * 0.06

/** each library's best average in every category, marked where it counts as first */
export const PickThree = () => (
	<figure
		className="p3"
		id="pick3"
		aria-label="Each library's average multiple of the best result, by category"
		data-pick3
	>
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
												<span className="p3-mark" role="img" aria-label="first">
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
			<span>{pickThreeTable.shown}</span>
			<Link href={methodHref}>how we measured →</Link>
		</p>
	</figure>
)
