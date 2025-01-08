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
		<table className="w-full border-collapse">
			<ApiTableHeader />
			<tbody>
				{apiDocsByGroup[group].map(props => (
					<ApiTableRow key={props.name} {...props} />
				))}
			</tbody>
		</table>
	</>
)

const ApiTableHeader = () => (
	<thead>
		<tr>
			<th className="p-2 text-left align-top whitespace-nowrap w-auto min-w-[100px]">
				Name
			</th>
			<th className="w-1/4 p-2 text-left align-top min-w-[200px]">Summary</th>
			<th className="w-full p-2 text-left align-top">Example</th>
		</tr>
	</thead>
)

interface ApiTableRowProps {
	name: string
	summary: ParsedJsDocPart[]
	example?: string
}

const ApiTableRow = ({ name, summary, example }: ApiTableRowProps) => {
	const lines = example?.split("\n").length ?? 0
	const isShort = lines <= 3

	return (
		<tr key={name}>
			<td className="p-2 align-top whitespace-nowrap w-auto">{name}</td>
			<td className="w-1/4 p-2 align-top">{JsDocParts(summary)}</td>
			<td className="w-full p-2 align-top">
				<ApiExample example={example} isShort={isShort} />
			</td>
		</tr>
	)
}

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
	example: string
	isShort: boolean
}

const ApiExample = ({ example, isShort }: ApiExampleProps) => {
	if (!example) return null

	return isShort ?
			<CodeBlock style={{ margin: 0 }} decorators={["@noErrors"]}>
				{example}
			</CodeBlock>
		:	<details>
				<summary>View Example</summary>
				<CodeBlock style={{ margin: 0 }} decorators={["@noErrors"]}>
					{example}
				</CodeBlock>
			</details>
}
