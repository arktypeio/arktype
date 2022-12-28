import type { ExportData, TsDocData } from "./extractApi.ts"

type LinkDetails = [name: string, alias?: string]

const trimWhitespace = (text: string) => text.trim()

const extractLinkDetails = (regexMatch: RegExpMatchArray): LinkDetails => {
    const BASE_NAME = 1
    const ALIAS = 2
    const BASE_NAME_NO_ALIAS = 3
    return regexMatch[BASE_NAME_NO_ALIAS]
        ? [trimWhitespace(regexMatch[BASE_NAME_NO_ALIAS])]
        : [
              trimWhitespace(regexMatch[BASE_NAME]),
              trimWhitespace(regexMatch[ALIAS])
          ]
}

export const transformLinkTagToURL = (
    path: string,
    exportData: ExportData,
    entryNames: string[]
) => {
    const extractApiNameRegex = /{@link(.+)\|(.+)?}|{@link(.+)}/
    for (const data of exportData.tsDocs ?? []) {
        const match = data.text.match(extractApiNameRegex)
        if (match) {
            const [basename, alias]: LinkDetails = extractLinkDetails(match)
            if (entryNames.includes(basename)) {
                data.text = data.text.replace(
                    match[0],
                    `[${alias ?? basename}](./${basename}.md)`
                )
            } else {
                throw new Error(
                    `${basename} doesn't appear to be part of the API`
                )
            }
        }
    }
}

export type TsTagData = Record<string, string[]>

export const packTsDocTags = (docs: TsDocData[] | undefined) => {
    const tsTagData: TsTagData = {}
    for (const doc of docs ?? []) {
        const tagName = doc.tag
        const tagText = doc.text.replace(`@${tagName}`, "").replaceAll("*", "")
        if (tsTagData[tagName]) {
            tsTagData[tagName].push(tagText)
        } else {
            tsTagData[tagName] = [tagText]
        }
    }
    return tsTagData
}

export const formatTagData = (arr: string[], tag: string) => {
    let ret = ""
    if (tag === "param") {
        const tableHeaders = `| Variable      | Description |
        | ----------- | ----------- |\n`
        ret += tableHeaders
        for (const data of arr) {
            const variable = data.trim().split(" ")[0]
            const description = data
                .replace(variable, "")
                .replace("\n", "")
                .trim()
            ret += `| ${variable}  | ${description} |\n`
        }
        return ret
    }
    for (const data of arr) {
        ret += `- ${data}`
        ret += arr.length === 1 ? "\n" : "<br/>\n"
    }
    return ret
}
