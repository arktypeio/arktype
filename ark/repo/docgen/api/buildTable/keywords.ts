import type { TsTagData } from "../tsDocTransforms.js"
import {
	constructHeader,
	constructRow,
	defaultKeywordsHeader
} from "./table.js"

export const keywordTable = (text: string, tags: TsTagData) => {
	const keywords = tags.keywords
	const keywordMatcher = /(?<=keywords: ).+/
	let descriptionsByKeyword: { [keyword: string]: string } | undefined
	if (keywords) {
		const matchedKeyword = keywords[0]
			.replaceAll("\n", "")
			.match(keywordMatcher)
		if (matchedKeyword) {
			descriptionsByKeyword = JSON.parse(matchedKeyword[0])
		}
	}

	const scopeAliases = text.split("\n").slice(1, -1)
	const table: string[] = []
	constructHeader(defaultKeywordsHeader, table)
	for (const prop of scopeAliases) {
		const keyword = prop.trim().match(/^([^:]+):(.+)$/)
		if (keyword) {
			const description =
				descriptionsByKeyword ? descriptionsByKeyword[keyword[1]] ?? "" : ""
			const row = constructRow([keyword[1], keyword[2], description], ["1"])
			table.push(row)
		}
	}
	return table
}
