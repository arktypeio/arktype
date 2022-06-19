import { join } from "node:path"
import { ensureDir, shell, writeFile } from "@re-/node"
import { EntryPointData, ExportData, RepoMetadata } from "./extract.js"

export const writeDocs = (repoMetadata: RepoMetadata, outDir: string) => {
    for (const pkg of repoMetadata) {
        const packageOutDir = join(outDir, pkg.name)
        for (const entryPoint of pkg.api) {
            const entryPointOutDir =
                entryPoint.subpath === "."
                    ? packageOutDir
                    : join(packageOutDir, entryPoint.subpath)
            ensureDir(entryPointOutDir)
            writeEntryPoint(entryPoint, entryPointOutDir)
        }
    }
    shell(`prettier --write ${outDir}`)
}

const writeEntryPoint = (
    entryPoint: EntryPointData,
    entryPointOutDir: string
) => {
    for (const exported of entryPoint.exports) {
        const mdFilePath = join(entryPointOutDir, `${exported.name}.md`)
        writeFile(mdFilePath, generateMarkdownForExport(exported))
    }
}

const generateMarkdownForExport = (exported: ExportData) => {
    const md = new MarkdownSection(exported.name)
    md.section("tags").text(JSON.stringify(exported.tsDocs, null, 4))
    md.section("text").text(exported.text)
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
