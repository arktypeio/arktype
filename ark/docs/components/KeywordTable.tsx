import { keywordRowsByTable, type KeywordTableName } from "../lib/keywords.ts"
import { Table } from "./mdx/Table.tsx"

const withInlineCode = (text: string) =>
	text
		.split(/`([^`]+)`/)
		.map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part))

/** `string.email` as ArkDark shows it: the subtype path in teal */
const KeywordName = ({ alias }: { alias: string }) => {
	const dot = alias.indexOf(".")
	return (
		<code className="kw-name">
			{dot === -1 ?
				alias
			:	<>
					{alias.slice(0, dot)}
					<span className="kw-path">{alias.slice(dot)}</span>
				</>
			}
		</code>
	)
}

/**
 * A group's keywords. Each row's id is its alias, so `#string.email` links
 * to it, except a group's own root, whose id belongs to the group's heading.
 */
export const KeywordTable = ({ name }: { name: KeywordTableName }) => (
	<Table className="keyword-table">
		<thead>
			<tr>
				<th scope="col">keyword</th>
				<th scope="col">description</th>
			</tr>
		</thead>
		<tbody>
			{keywordRowsByTable[name].map(({ alias, description }) => (
				<tr key={alias} id={alias === name ? undefined : alias}>
					<td>
						<KeywordName alias={alias} />
					</td>
					<td>{withInlineCode(description)}</td>
				</tr>
			))}
		</tbody>
	</Table>
)
