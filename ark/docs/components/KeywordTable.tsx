import { append, entriesOf, flatMorph } from "@ark/util"
import { ark, Generic } from "arktype"
import { arkPrototypes } from "arktype/internal/keywords/constructors.ts"
import type { JSX } from "react"

const tableNames = [
	"string",
	"number",
	"other",
	"object",
	"array",
	"FormData",
	"TypedArray",
	"instanceof",
	"generic"
] as const

type TableName = (typeof tableNames)[number]

const tableRowsByName = flatMorph(tableNames, (i, name) => [
	name,
	[] as JSX.Element[]
])

entriesOf(ark.internal.resolutions)
	.map(
		([alias, v]) =>
			[alias.endsWith(".root") ? alias.slice(0, -5) : alias, v] as const
	)
	.sort((l, r) => (l[0] < r[0] ? -1 : 1))
	.forEach(([alias, v]) => {
		// should not occur, only for temporary resolutions of cyclic definition
		if (typeof v === "string") return

		const name =
			alias.startsWith("string") ? "string"
			: alias.startsWith("number") ? "number"
			: alias.startsWith("FormData") ? "FormData"
			: alias.startsWith("Array") ? "array"
			: alias.startsWith("object") ? "object"
			: alias.startsWith("TypedArray") ? "TypedArray"
			: v instanceof Generic ? "generic"
			: alias in arkPrototypes ? "instanceof"
			: "other"

		tableRowsByName[name] = append(
			tableRowsByName[name],
			<tr key={alias}>
				<td>{alias}</td>
				<td>{v.description}</td>
			</tr>
		)
	})

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
