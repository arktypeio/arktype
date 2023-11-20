import {
	constructHeader,
	constructRow,
	convertToHTML
} from "./buildTable/table.js"
import type { ExportData, TsDocData } from "./extractApi.js"

type LinkDetails = [name: string, alias?: string]

const extractLinkDetails = (regexMatch: RegExpMatchArray): LinkDetails => {
	const BASE_NAME = 1
	const ALIAS = 2
	const BASE_NAME_NO_ALIAS = 3
	return regexMatch[BASE_NAME_NO_ALIAS]
		? [regexMatch[BASE_NAME_NO_ALIAS].trim()]
		: [regexMatch[BASE_NAME].trim(), regexMatch[ALIAS].trim()]
}

export const transformLinkTagToURL = (
	path: string,
	exportData: ExportData,
	entryNames: string[]
) => {
	const extractApiNameRegex = /{@link(.+?)\|(.+)?}|{@link(.+)}/
	for (const data of exportData.tsDocs ?? []) {
		const match = data.text.match(extractApiNameRegex)
		if (match) {
			const [basename, alias]: LinkDetails = extractLinkDetails(match)
			if (entryNames.includes(basename)) {
				data.text = data.text.replace(
					match[0],
					`[${alias ?? basename}](./${basename.toLowerCase()}.md)`
				)
			} else {
				throw new Error(`${basename} doesn't appear to be part of the API`)
			}
		}
	}
}

export type TsTagData = Record<string, string[]>

export const packTsDocTags = (docs: TsDocData[] | undefined) => {
	const tsTagData: TsTagData = {}
	for (const doc of docs ?? []) {
		const tagName = doc.tag
		const tagText = doc.text
		if (tsTagData[tagName]) {
			tsTagData[tagName].push(tagText)
		} else {
			tsTagData[tagName] = [tagText]
		}
	}
	return tsTagData
}

export const formatTagData = (tagData: string[], tag: string) => {
	let formattedData = ""
	if (tag === "param" || tag === "tableRow") {
		const table: string[] = []
		constructHeader(["Variable", "Description"], table)
		for (const data of tagData) {
			const variable = data.trim().split(" ")[0]
			const row = constructRow([variable, data.replace(variable, "")])
			table.push(row)
		}
		return table.join("\n")
	}
	const convertedTagData = convertToHTML(tagData)
	for (const data of convertedTagData) {
		formattedData += `- ${data}`
		formattedData += tagData.length === 1 ? "\n" : "<br/>\n"
	}
	return formattedData
}
