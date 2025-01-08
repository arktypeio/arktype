import { throwInternalError } from "@ark/util"
import type { JSX } from "react"
import type { ApiGroup, ParsedJsDocPart } from "../../repo/jsdocGen.ts"
import { apiDocsByGroup } from "./apiData.ts"
import { CodeBlock } from "./CodeBlock.tsx"
import { LocalFriendlyUrl } from "./LocalFriendlyUrl.tsx"

export type ApiTableProps = {
	group: ApiGroup
	rows: JSX.Element[]
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
			<th className="p-2 text-left align-top">Example</th>
		</tr>
	</thead>
)

interface ApiTableRowProps {
	name: string
	summary: ParsedJsDocPart[]
	example?: string
}

const ApiTableRow = ({ name, summary, example }: ApiTableRowProps) => (
	<tr key={name}>
		<td className="p-2 align-top whitespace-nowrap w-auto">{name}</td>
		<td className="p-2 align-top">{JsDocParts(summary)}</td>
		<td className="p-2 align-top">
			<ApiExample>{example}</ApiExample>
		</td>
	</tr>
)

const JsDocParts = (parts: readonly ParsedJsDocPart[]) =>
	parts.map((part, i) => {
		switch (part.kind) {
			case "text":
				return (
					<p style={{ display: "inline" }} key={i}>
						{part.value}
					</p>
				)
			case "link":
				return (
					<LocalFriendlyUrl url={part.url} key={i}>
						{part.value}
					</LocalFriendlyUrl>
				)
			case "reference":
				return (
					<a href={`#${part.value}`} key={i}>
						{part.value}
					</a>
				)
			case "tag":
				return (
					<p style={{ display: "inline" }} key={i}>
						{part.name} {JsDocParts(part.value)}
					</p>
				)
			default:
				const exhaustive = part satisfies never as ParsedJsDocPart
				return throwInternalError(
					`Unexpected JsdocPart kind "${exhaustive.kind}"`
				)
		}
	})

interface ApiExampleProps {
	children: string | undefined
}

const ApiExample = ({ children }: ApiExampleProps) =>
	children && (
		<CodeBlock
			style={{ margin: 0, overflow: "scroll" }}
			decorators={["@noErrors"]}
		>
			{children}
		</CodeBlock>
	)
