import type { ApiGroup, ParsedJsDocPart } from "../../repo/jsdocGen.ts"
import { apiDocsByGroup } from "./apiData.ts"
import { CodeBlock } from "./CodeBlock.tsx"
import { LocalFriendlyUrl } from "./LocalFriendlyUrl.tsx"

export type ApiTableProps = {
	group: ApiGroup
}

export const ApiTable = ({ group }: ApiTableProps) => (
	<>
		<h2>{group}</h2>
		<div className="w-full overflow-x-auto">
			<table className="w-full table-fixed border-collapse">
				<colgroup>
					<col className="w-28" />
					<col className="w-1/4" />
					<col className="w-full" />
				</colgroup>
				<ApiTableHeader />
				<tbody>
					{apiDocsByGroup[group].map(props => (
						<ApiTableRow key={props.name} {...props} />
					))}
				</tbody>
			</table>
		</div>
	</>
)

const ApiTableHeader = () => (
	<thead>
		<tr>
			<th className="p-2 text-left align-top whitespace-nowrap w-auto min-w-[100px]">
				Name
			</th>
			<th className="p-2 text-left align-top min-w-[200px]">Summary</th>
			<th className="p-2 text-left align-top">Notes & Examples</th>
		</tr>
	</thead>
)

interface ApiTableRowProps {
	name: string
	summary: ParsedJsDocPart[]
	example?: string
	notes: ParsedJsDocPart[][]
}

const ApiTableRow = ({ name, summary, example, notes }: ApiTableRowProps) => (
	<tr key={name}>
		<td
			style={{
				fontSize:
					name.length < 12 ? "1rem"
					: name.length < 16 ? "0.7rem"
					: "0.6rem"
			}}
			className="p-2 align-top whitespace-nowrap w-auto"
		>
			{name}
		</td>
		<td className="p-2 align-top">{JsDocParts(summary)}</td>
		<td className="p-2 align-top">
			{notes.map((note, i) => (
				<div key={i}>{JsDocParts(note)} </div>
			))}
			<ApiExample>{example}</ApiExample>
		</td>
	</tr>
)

const JsDocParts = (parts: readonly ParsedJsDocPart[]) =>
	parts.map((part, i) => (
		<span key={i} style={{ marginRight: "0.25em" }}>
			{part.kind === "link" ?
				<LocalFriendlyUrl url={part.url} key={i}>
					{part.value}
				</LocalFriendlyUrl>
			: part.kind === "reference" ?
				<a href={`#${part.value}`} key={i}>
					{part.value}
				</a>
			: part.kind === "tag" ?
				<p key={i}>
					{part.name} {JsDocParts(part.value)}
				</p>
			:	<p
					style={{ display: "inline" }}
					key={i}
					dangerouslySetInnerHTML={{
						__html: part.value
							.replace(/(\*\*|__)([^*_]+)\1/g, "<strong>$2</strong>")
							.replace(/(\*|_)([^*_]+)\1/g, "<em>$2</em>")
							.replace(/`([^`]+)`/g, "<code>$1</code>")
							.replace(/^-(.*)/g, "• $1")
					}}
				/>
			}
		</span>
	))

interface ApiExampleProps {
	children: string | undefined
}

const ApiExample = ({ children }: ApiExampleProps) =>
	children && (
		<CodeBlock style={{ margin: 0 }} decorators={["@noErrors"]}>
			{children}
		</CodeBlock>
	)
