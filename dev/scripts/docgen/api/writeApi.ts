import { appendFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { ensureDir, shell } from "../../../runtime/main.ts"
import type { DocGenApiConfig } from "../main.ts"
import type {
    ApiEntryPoint,
    ExportData,
    PackageExtractionData
} from "./extractApi.ts"
import { packDataForTable, tabulateData } from "./keywordTable.ts"
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
    generateKeywordMasterList(entryPointOutDir)
}

const scopeData: { [k: string]: string }[] = []

const generateKeywordMasterList = (entryPointOutDir: string) => {
    const keywordsPath = join(entryPointOutDir, "keywords.md")
    const md = new MarkdownSection("Keywords")
    md.options({ hide_table_of_contents: true })
    scopeData.forEach((data) => md.section(data.name).text(data.text))
    writeFileSync(keywordsPath, md.toString())
}

const generateMarkdownForExport = (
    exported: ExportData,
    tagData: TsTagData
) => {
    const tagsToIgnore = ["descriptions", "scope"]
    const md = new MarkdownSection(exported.name)
    md.options({ hide_table_of_contents: true })
    for (const [tag, arrayOfTagData] of Object.entries(tagData)) {
        if (tagsToIgnore.includes(tag)) {
            continue
        }
        md.section(tag).text(formatTagData(arrayOfTagData, tag))
    }
    if (tagData.scope) {
        const textAsTable = tabulateData(packDataForTable(exported, tagData))
        md.section("text").text(textAsTable)
        scopeData.push({ name: exported.name, text: textAsTable })
    } else {
        md.section("text").tsBlock(exported.text)
    }

    return md.toString()
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
