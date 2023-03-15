import type { ExportData } from "./extractApi"
import type { TsTagData } from "./tsDocTransforms"

type KeywordData = {
    scope: string
    types: Record<string, Record<string, string>>
}
export const packDataForTable = (exportData: ExportData, tags: TsTagData) => {
    const descriptions = tags.descriptions
    const descriptionMatcher = /(?<=descriptions: ).+/
    let descriptionObject: undefined | { [k: string]: string }
    if (descriptions) {
        const matchedDescription = descriptions[0]
            .replaceAll("\n", "")
            .match(descriptionMatcher)
        if (matchedDescription) {
            descriptionObject = JSON.parse(matchedDescription[0])
        }
    }

    const objectMatch = exportData.text.match(/{[\s\S]*?}/)
    if (!objectMatch) {
        throw new Error("unexpected text")
    }
    const matchedObject = objectMatch[0].split("\n")
    const props = matchedObject.slice(1, matchedObject.length - 1)

    const keywordData: KeywordData = {
        scope: exportData.name,
        types: {}
    }
    for (const prop of props) {
        const keyword = prop.trim().match(/^([^:]+):(.+)$/)
        if (keyword) {
            keywordData.types[keyword[1]] = {
                type: keyword[2].replace(";", ""),
                comment: descriptionObject
                    ? descriptionObject[keyword[1]] ?? ""
                    : ""
            }
        }
    }

    return keywordData
}

export const tabulateData = (data: KeywordData) => {
    const tableHeader = `| Name   | Type   | Description          |\n| ------ | ------ | -------------------- |`
    const section = []
    section.push(tableHeader)
    Object.entries(data.types).forEach((type) => {
        const comment = type[1].comment
        const description = comment.length ? comment : "----"
        section.push(`| ${type[0]} | \`${type[1].type}\` | ${description} |`)
    })
    return `${section.join("\n")}\n`
}
