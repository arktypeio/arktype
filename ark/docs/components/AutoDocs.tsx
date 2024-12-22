import { flatMorph } from "@ark/util"
import { ark } from "arktype"
import { Fragment } from "react"

export const AutoDocs = () => {
	const flattened = flatMorph(ark.internal.resolutions, (k, v) =>
		"description" in v ? [k, v.description] : []
	)

	const groupedEntries = Object.entries(flattened).reduce(
		(acc, [k, v]) => {
			if (!k.includes(".")) acc.root.push([k, v])
			else {
				const [group, ...rest] = k.split(".")
				acc.other[group] ??= { vals: [] }
				const groupType = rest.join(".")
				if (groupType === "root") acc.other[group].description = v
				else acc.other[group].vals.push([groupType, v])
			}
			return acc
		},
		{ root: [], other: {} } as {
			root: [string, string][]
			other: Record<string, { description?: string; vals: [string, string][] }>
		}
	)

	return (
		<table>
			<thead>
				<tr>
					<th className="font-bold">Type</th>
					<th className="font-bold">Description</th>
				</tr>
			</thead>
			<tbody>
				{groupedEntries.root.map(([k, v]) => (
					<tr key={k}>
						<td>{k}</td>
						<td>{v}</td>
					</tr>
				))}
				{Object.entries(groupedEntries.other).map(([key, v]) => (
					<Fragment key={key}>
						<tr className="font-bold" id={key}>
							<td colSpan={3}>
								<a
									href={`#${key}`}
									className="w-full h-full no-underline hover:underline"
								>
									{key}
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
				))}
			</tbody>
		</table>
	)
}
