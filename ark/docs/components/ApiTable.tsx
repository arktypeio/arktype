import { throwInternalError } from "@ark/util"
import type { JSX } from "react"
import { apiDocsByGroup } from "./apiData.ts"

export type ApiTableProps = {
	group: keyof typeof apiDocsByGroup
	rows: JSX.Element[]
}

export const ApiTable = ({ group }: ApiTableProps) => {
	const rows = apiDocsByGroup[group].map(({ name, parts }) => (
		<tr key={name}>
			<td>{name}</td>
			<td>{parts.map(JsDocPart)}</td>
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
					</tr>
				</thead>
				<tbody>{...rows}</tbody>
			</table>
		</>
	)
}

type JsdocPartProps =
	(typeof apiDocsByGroup)[keyof typeof apiDocsByGroup][0]["parts"][number]

const JsDocPart = (part: JsdocPartProps) => {
	switch (part.kind) {
		case "text":
			return <>{part.text}</>
		case "reference":
			return <a href={`#${part.to}`}>{part.to}</a>
		default:
			throwInternalError(
				`Unexpected JSdoc part ${part.kind} with text ${part.text}`
			)
	}
}
