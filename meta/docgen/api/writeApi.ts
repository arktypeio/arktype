import { rmSync } from "node:fs"
import { join } from "node:path"
import { ensureDir, shell, writeFile } from "../../node/index.js"
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
        const entryPointOutDir =
            entryPoint.subpath === "."
                ? apiConfig.outDir
                : join(apiConfig.outDir, entryPoint.subpath)
        ensureDir(entryPointOutDir)
        writeEntryPoint(entryPoint, entryPointOutDir)
    }
    shell(`prettier --write ${apiConfig.outDir}`)
}

const writeEntryPoint = (
    entryPoint: ApiEntryPoint,
    entryPointOutDir: string
) => {
    for (const exported of entryPoint.exports) {
        const mdFilePath = join(entryPointOutDir, `${exported.name}.md`)
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
