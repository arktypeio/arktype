import { append, entriesOf, flatMorph } from "@ark/util"
import { ark, Generic } from "arktype"
import { arkPrototypes } from "arktype/internal/keywords/constructors.ts"
import type { JSX } from "react"

const tableNames = ["Type"] as const

type TableName = (typeof tableNames)[number]

const tableRowsByName = flatMorph(tableNames, (i, name) => [
	name,
	[] as JSX.Element[]
])

export type KeywordTableProps = {
	name: TableName
	rows: JSX.Element[]
}

export const KeywordTable = ({ name, rows }: KeywordTableProps) => (
	<>
		<h2>{name}</h2>
		<table>
			<thead>
				<tr>
					<th className="font-bold">Alias</th>
					<th className="font-bold">Description</th>
				</tr>
			</thead>
			<tbody>{...rows}</tbody>
		</table>
	</>
)

export const AllKeywordTables = () =>
	tableNames.map(name => (
		<KeywordTable name={name} rows={tableRowsByName[name]} />
	))
