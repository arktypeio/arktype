import { entriesOf, hasKey } from "@ark/util"
import { ark } from "arktype"
import { Fragment } from "react"

type DescriptionEntry = [alias: string, description: string]

const root: DescriptionEntry[] = []
const other: Record<
	string,
	{ description?: string; vals: DescriptionEntry[] }
> = {}

entriesOf(ark.internal.resolutions).forEach(([k, v]) => {
	if (!hasKey(v, "description")) return

	if (!k.includes(".")) return root.push([k, v.description])

	const [group, ...rest] = k.split(".")
	other[group] ??= { vals: [] }
	const groupType = rest.join(".")
	if (groupType === "root") other[group].description = v.description
	else other[group].vals.push([groupType, v.description])
})

const rootElements = root.map(([k, v]) => (
	<tr key={k}>
		<td>{k}</td>
		<td>{v}</td>
	</tr>
))

const otherElements = Object.entries(other).map(([k, v]) => (
	<Fragment key={k}>
		<tr className="font-bold" id={k}>
			<td colSpan={3}>
				<a
					href={`#${k}`}
					className="w-full h-full no-underline hover:underline"
				>
					{k}
					{v.description ? ` - ${v.description}` : ""}
				</a>
			</td>
		</tr>
		{v.vals.map(([k, v]) => (
			<tr key={k}>
				<td>{k}</td>
				<td>{v}</td>
			</tr>
		))}
	</Fragment>
))

export const AutoDocs = () => (
	<table>
		<thead>
			<tr>
				<th className="font-bold">Type</th>
				<th className="font-bold">Description</th>
			</tr>
		</thead>
		<tbody>
			{...rootElements}
			{...otherElements}
		</tbody>
	</table>
)
