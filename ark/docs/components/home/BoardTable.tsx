import Link from "next/link"
import type { CSSProperties } from "react"
import { categories } from "../../lib/claims.ts"
import { boardTable, boardUnits, methodHref } from "./boardFacts.ts"
import { CheckIcon } from "./icons.tsx"

/** ArkType's marks land last, after every other row's */
const markDelay = (row: number, column: number) =>
	row === 0 ? 0.75 + column * 0.22 : 0.3 + row * 0.06

/** every number on the board: each library's mean and place in each graph */
export const BoardTable = () => {
	const units = boardUnits()
	return (
		<figure
			className="p3"
			id="pick3"
			aria-label="Each library's geometric mean and place, by category"
			data-pick3
		>
			<table className="p3-table">
				<thead>
					<tr>
						<th scope="col">library</th>
						{categories.map(category => (
							<th key={category.id} scope="col" title={units[category.id]}>
								{category.id}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{boardTable().map((row, r) => (
						<tr
							key={row.library}
							className={r === 0 ? "is-ours" : undefined}
							style={{ "--r": r } as CSSProperties}
						>
							<th scope="row">{row.library}</th>
							{categories.map((category, c) => {
								const cell = row.cells[category.id]
								return (
									<td
										key={category.id}
										className={cell?.first ? "is-first" : undefined}
										style={{ "--at": `${markDelay(r, c)}s` } as CSSProperties}
									>
										{cell ?
											<span
												className={cell.first ? "p3-cell" : "p3-cell is-placed"}
											>
												{cell.first ?
													<span
														className="p3-mark"
														role="img"
														aria-label="first"
													>
														<CheckIcon />
													</span>
												:	<span className="p3-place">{cell.place}</span>}
												{cell.text}
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
				{categories.map(category => (
					<span key={category.id}>
						{category.id}: {units[category.id]}
					</span>
				))}
				<span>— didn't run every result that graph averages</span>
				<Link href={methodHref}>how we measured →</Link>
			</p>
		</figure>
	)
}
