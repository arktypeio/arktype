import { appendFileSync, rmSync } from "node:fs"
import { join } from "node:path"
import { ensureDir, shell } from "../../../runtime/main.ts"
import type { DocGenApiConfig } from "../main.ts"
import type {
    ApiEntryPoint,
    ExportData,
    PackageExtractionData
} from "./extractApi.ts"
import type { TsTagData } from "./tsDocTransforms.ts"
import {
    formatTagData,
    packTsDocTags,
    transformLinkTagToURL
} from "./tsDocTransforms.ts"

export const writeApi = (
    apiConfig: DocGenApiConfig,
    extractedData: PackageExtractionData
) => {
    rmSync(apiConfig.outDir, { recursive: true, force: true })
    for (const entryPoint of extractedData.api) {
        const entryNames = entryPoint.exports.map((entry) => entry.name)
        const entryPointOutDir =
            entryPoint.subpath === "."
                ? apiConfig.outDir
                : join(apiConfig.outDir, entryPoint.subpath)
        ensureDir(entryPointOutDir)
        writeEntryPoint(entryPoint, entryPointOutDir, entryNames)
    }
    shell(`prettier --write ${apiConfig.outDir}`)
}
const scopeData: ExportData[] = []
const writeEntryPoint = (
    entryPoint: ApiEntryPoint,
    entryPointOutDir: string,
    entryNames: string[]
) => {
    for (const exported of entryPoint.exports) {
        const mdFilePath = join(
            entryPointOutDir,
            `${exported.name.toLowerCase()}.md`
        )
        transformLinkTagToURL(mdFilePath, exported, entryNames)
        const data = packTsDocTags(exported.tsDocs ?? [])
        // items with same name write to same file for now (e.g. type/Type) to
        // avoid a docusaurus build failure
        appendFileSync(mdFilePath, generateMarkdownForExport(exported, data))
    }
    const keywordsPath = join(entryPointOutDir, "keywords.md")
    scopeData.forEach((data) =>
        appendFileSync(keywordsPath, generateMarkdownForExport(data, {}))
    )
}

const generateMarkdownForExport = (
    exported: ExportData,
    tagData: TsTagData
) => {
    const md = new MarkdownSection(exported.name)
    md.options({ hide_table_of_contents: true })
    for (const [tag, arrayOfTagData] of Object.entries(tagData)) {
        md.section(tag).text(formatTagData(arrayOfTagData, tag))
    }
    let text
    if (tagData.scope) {
        text = tabulateData(packDataForTable(exported, tagData))
        scopeData.push({ name: exported.name, text, tsDocs: undefined })
    } else {
        text = exported.text
    }
    md.section("text").tsBlock(text)
    return md.toString()
}
type KeywordData = {
    scope: string
    types: Record<string, Record<string, string>>
}
const packDataForTable = (exportData: ExportData, tags: TsTagData) => {
    const descriptions = tags.descriptions
    const descriptionMatcher = /(?<=descriptions: ).+/
    let descriptionObject
    if (descriptions) {
        const matchedDescription = descriptions[0].match(descriptionMatcher)
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
const tabulateData = (data: KeywordData) => {
    const tableHeader = `| Name   | Type   | Description          |\n| ------ | ------ | -------------------- |`
    const section = []
    section.push(tableHeader)
    Object.entries(data.types).forEach((type) => {
        const comment = type[1].comment
        const additional = comment.length ? comment : "----"
        section.push(`| ${type[0]} | ${type[1].type} | ${additional} |`)
    })
    return `${section.join("\n")}\n`
}
class MarkdownSection {
    private contents: (string | MarkdownSection)[]
    private optionsAdded = false
    constructor(header: string, private depth = 1) {
        this.contents = [`${"#".repeat(depth)} ${header}\n`]
    }

    options(options: {}) {
        if (!this.optionsAdded) {
            const optionLines = ["---"]
            for (const [k, v] of Object.entries(options)) {
                optionLines.push(`${k}: ${v}`)
            }
            optionLines.push("---\n")
            this.contents.unshift(optionLines.join("\n"))
        }
        this.optionsAdded = true
    }
    section(header: string) {
        const section = new MarkdownSection(header, this.depth + 1)
        this.contents.push(section)
        return section
    }

    tsBlock(content: string) {
        return this.codeBlock(content, "ts")
    }

    codeBlock(content: string, language: string) {
        this.contents.push("```" + language + "\n" + content + "\n```\n")
        return this
    }

    text(content: string) {
        this.contents.push(`${content}\n`)
        return this
    }

    toString(): string {
        return this.contents.reduce(
            (result: string, section) => result + section.toString(),
            ""
        )
    }
}
