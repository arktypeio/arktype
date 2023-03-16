import type { ExportData } from "./extractApi"
import type { TsTagData } from "./tsDocTransforms"

export const tabulateData = (exportData: ExportData, tags: TsTagData) => {
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

    const scopeAliases = exportData.text.split("\n").slice(1, -1)

    const section = [
        `| Name   | Type   | Description          |`,
        `| ------ | ------ | -------------------- |`
    ]
    for (const prop of scopeAliases) {
        const keyword = prop.trim().match(/^([^:]+):(.+)$/)
        if (keyword) {
            const description = descriptionsByKeyword
                ? descriptionsByKeyword[keyword[1]] ?? ""
                : ""
            section.push(
                `| ${keyword[1]} | \`${keyword[2].replace(
                    ";",
                    ""
                )}\` | ${description} |`
            )
        }
    }

    return `${section.join("\n")}\n`
}
