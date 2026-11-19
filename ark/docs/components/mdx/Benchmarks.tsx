import { jitComparison } from "../../lib/bench/bench.ts"
import {
	leftOutText,
	ownSpeedTable,
	ownTable,
	resultsTable,
	runsTable,
	standingsTable,
	type OwnTableId,
	type TextTable
} from "../../lib/bench/boardTables.ts"
import type { CategoryId } from "../../lib/bench/leaderboard.ts"
import { unitBoards } from "../../lib/bench/units.ts"
import { captionOf } from "../home/boardFacts.ts"
import { Table } from "./Table.tsx"

/** a precompiled build against dynamic ArkType on one app: what the build step changes */
export const JitComparison = () => {
	const { summary, header, rows, note } = jitComparison()
	return (
		<>
			<p>{summary}</p>
			<Table>
				<thead>
					<tr>
						{header.map(cell => (
							<th key={cell}>{cell}</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map(([label, ...cells]) => (
						<tr key={label}>
							<td>{label}</td>
							{cells.map((cell, i) => (
								<td key={i}>{cell}</td>
							))}
						</tr>
					))}
				</tbody>
			</Table>
			<p>{note}</p>
		</>
	)
}

type TextTableViewProps = {
	table: TextTable
}

const TextTableView = ({ table: { header, rows } }: TextTableViewProps) => (
	<Table>
		<thead>
			<tr>
				{header.map(cell => (
					<th key={cell}>{cell}</th>
				))}
			</tr>
		</thead>
		<tbody>
			{rows.map(cells => (
				<tr key={cells.slice(0, 2).join(" ")}>
					{cells.map((cell, i) => (
						<td key={i}>{cell}</td>
					))}
				</tr>
			))}
		</tbody>
	</Table>
)

export type BoardCategoryProps = {
	category: CategoryId
}

/** what one of the board's graphs measures and where its results are from, as the homepage captions it */
export const BoardCaption = ({ category }: BoardCategoryProps) => (
	<p>
		<strong>{captionOf(unitBoards[category])}.</strong>
	</p>
)

/** one of the homepage board's graphs as a table: every library it ranks */
export const BoardStandings = ({ category }: BoardCategoryProps) => (
	<TextTableView table={standingsTable(category)} />
)

/** every result one of the board's graphs averages */
export const BoardResults = ({ category }: BoardCategoryProps) => (
	<TextTableView table={resultsTable(category)} />
)

/** which public results one of the board's graphs doesn't average, and why; nothing where it averages them all */
export const BoardLeftOut = ({ category }: BoardCategoryProps) => {
	const text = leftOutText(category)
	return text ? <p>{text}</p> : null
}

/** when each benchmark on the board was measured */
export const BoardRuns = () => <TextTableView table={runsTable()} />

/** our benchmark's speed, a library a row */
export const OwnSpeed = () => <TextTableView table={ownSpeedTable()} />

export type OwnResultsProps = {
	table: OwnTableId
}

/** one of our own benchmark's suites, every app a column */
export const OwnResults = ({ table }: OwnResultsProps) => (
	<TextTableView table={ownTable(table)} />
)
