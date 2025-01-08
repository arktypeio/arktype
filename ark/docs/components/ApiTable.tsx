import { throwInternalError } from "@ark/util"
import type { JSX } from "react"
import type { ApiGroup, ParsedJsDocPart } from "../../repo/jsdocGen.ts"
import { apiDocsByGroup } from "./apiData.ts"
import { LocalFriendlyUrl } from "./LocalFriendlyUrl.tsx"

export type ApiTableProps = {
	group: ApiGroup
	rows: JSX.Element[]
}

export const ApiTable = ({ group }: ApiTableProps) => {
	const rows = apiDocsByGroup[group].map(({ name, body, tags }) => (
		<tr key={name}>
			<td>{name}</td>
			<td>{JsDocParts(body)}</td>
			<td>{tags.example ? JsDocParts(tags.example) : null}</td>
		</tr>
	))

	return (
		<>
			<h2>{group}</h2>
			<table>
				<thead>
					<tr>
						<th className="font-bold">Alias</th>
						<th className="font-bold">Description</th>
						<th className="font-bold">Example</th>
					</tr>
				</thead>
				<tbody>{...rows}</tbody>
			</table>
		</>
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
