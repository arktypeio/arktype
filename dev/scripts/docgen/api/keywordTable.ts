import type { ExportData } from "./extractApi"
import type { TsTagData } from "./tsDocTransforms"

export const tabulateData = (exportData: ExportData, tags: TsTagData) => {
    const keywords = tags.keywords
    const keywordMatcher = /(?<=keywords: ).+/
    let keywordsObject: undefined | { [k: string]: string }
    if (keywords) {
        const matchedKeyword = keywords[0]
            .replaceAll("\n", "")
            .match(keywordMatcher)
        if (matchedKeyword) {
            keywordsObject = JSON.parse(matchedKeyword[0])
        }
    }

    const objectMatch = exportData.text.match(/{[\s\S]*?}/)
    if (!objectMatch) {
        throw new Error("unexpected text")
    }
    const matchedObject = objectMatch[0].split("\n")
    const props = matchedObject.slice(1, matchedObject.length - 1)

    const section = [
        `| Name   | Type   | Description          |`,
        `| ------ | ------ | -------------------- |`
    ]
    for (const prop of props) {
        const keyword = prop.trim().match(/^([^:]+):(.+)$/)
        if (keyword) {
            const description = keywordsObject
                ? keywordsObject[keyword[1]] ?? ""
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
