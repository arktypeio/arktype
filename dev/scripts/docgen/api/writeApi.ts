import { rmSync } from "node:fs"
import { join } from "node:path"
import { ensureDir, shell, writeFile } from "../../../runtime/exports.js"
import type { DocGenApiConfig } from "../main.js"
import type {
    ApiEntryPoint,
    ExportData,
    PackageExtractionData
} from "./extractApi.js"

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
        const mdFilePath = join(entryPointOutDir, `${exported.name}.md`)
        transformLinkTagToURL(mdFilePath, exported, entryNames)
        writeFile(mdFilePath, generateMarkdownForExport(exported))
    }
}

const generateMarkdownForExport = (exported: ExportData) => {
    const md = new MarkdownSection(exported.name)
    md.section("tags").tsBlock(JSON.stringify(exported.tsDocs, null, 4))
    md.section("text").tsBlock(exported.text)
    return md.toString()
}

class MarkdownSection {
    private contents: (string | MarkdownSection)[]
    constructor(header: string, private depth = 1) {
        this.contents = [`${"#".repeat(depth)} ${header}\n`]
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

const transformLinkTagToURL = (
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
