import { possibleFormats } from "../extractApi.js"

export const defaultOperatorHeader = ["operator", ...possibleFormats]
export const defaultKeywordsHeader = ["Name", "Type", "Description"]

export const constructRow = (
	rowData: string[],
	indexesToWrap: string[] = []
) => {
	let row = "| "
	for (const index in rowData) {
		const alteredData = convertToHTML(rowData)
		row += indexesToWrap.includes(index)
			? `\`${alteredData[index]}\`|`
			: `${alteredData[index]} |`
	}
	return row
}
export const constructHeader = (columns: string[], table: string[]) => {
	table.push(constructRow(columns))
	const separator = "---"
	const tableSeparator: string[] = []
	for (let i = 0; i < columns.length; i++) {
		tableSeparator.push(separator)
	}
	table.push(constructRow(tableSeparator))
}

const specialChars: { [k: string]: string } = {
	"\n": "",
	";": "",
	"|": "&vert;",
	"`": "\\`"
}

const specialCharsKeys = Object.keys(specialChars)

export const convertToHTML = (row: string[]) => {
	return row.map((item) => {
		specialCharsKeys.forEach(
			(char) => (item = item.replaceAll(char, specialChars[char]))
		)
		return item
	})
}
