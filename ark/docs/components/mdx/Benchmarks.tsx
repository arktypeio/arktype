import { jitComparison } from "../../lib/bench/bench.ts"
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
