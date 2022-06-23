import { rmSync } from "node:fs"
import { join } from "node:path"
import { ensureDir, shell, writeFile } from "@re-/node"
import { DocGenApiConfig } from "../config.js"
import { PackageExtractionData } from "../extract.js"
import { ApiEntryPoint, ExportData } from "./extractApi.js"

export type WritePackageApiContext = {
    packageApiConfig: DocGenApiConfig
    extractedPackage: PackageExtractionData
}

export const writePackageApi = ({
    extractedPackage,
    packageApiConfig
}: WritePackageApiContext) => {
    rmSync(packageApiConfig.outDir, { recursive: true, force: true })
    for (const entryPoint of extractedPackage.api) {
        const entryPointOutDir =
            entryPoint.subpath === "."
                ? packageApiConfig.outDir
                : join(packageApiConfig.outDir, entryPoint.subpath)
        ensureDir(entryPointOutDir)
        writeEntryPoint(entryPoint, entryPointOutDir)
    }
    shell(`prettier --write ${packageApiConfig.outDir}`)
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
