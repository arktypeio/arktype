import { flatMorph } from "@ark/util"
import type { JSX } from "react"
import {
	keywordRowsByTable,
	keywordTableNames,
	type KeywordRow
} from "../lib/keywords.ts"

const formatDescription = (description: string): JSX.Element => {
	if (!description.includes("`")) return <>{description}</>

	const segments = description.split(/(`[^`]+`)/)
	return (
		<>
			{segments.map((segment, i) => {
				if (segment.startsWith("`") && segment.endsWith("`")) {
					const code = segment.substring(1, segment.length - 1)
					return <code key={i}>{code}</code>
				}
				return <span key={i}>{segment}</span>
			})}
		</>
	)
}

type KeywordTableProps = {
	rows: readonly KeywordRow[]
}

const KeywordTable = ({ rows }: KeywordTableProps) => (
	<table>
		<thead>
			<tr>
				<th className="font-bold">Alias</th>
				<th className="font-bold">Description</th>
			</tr>
		</thead>
		<tbody>
			{rows.map(({ alias, description }) => (
				<tr key={alias}>
					<td>{alias}</td>
					<td>{formatDescription(description)}</td>
				</tr>
			))}
		</tbody>
	</table>
)

const KeywordTables = flatMorph(keywordTableNames, (i, name) => [
	name,
	() => <KeywordTable rows={keywordRowsByTable[name]} />
])

export const StringKeywordTable = KeywordTables.string

export const NumberKeywordTable = KeywordTables.number

export const GenericKeywordTable = KeywordTables.generic

export const AllKeywordTables = () =>
	keywordTableNames.map(name => (
		<>
			<h2>{name}</h2> <KeywordTable rows={keywordRowsByTable[name]} />
		</>
	))
