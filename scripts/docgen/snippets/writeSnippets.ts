import { dirname, join } from "node:path"
import { ensureDir, writeFile } from "@re-/node"
import { DocGenConfig } from "../config.js"
import { PackageMetadata } from "../extract.js"
import { FileSnippets } from "./extractSnippets.js"

export type WriteSnippetsContext = {
    config: DocGenConfig
    packageMetadata: PackageMetadata
    packageOutDir: string
}

export const writePackageSnippets = ({
    packageMetadata,
    packageOutDir
}: WriteSnippetsContext) => {
    if (!packageMetadata.snippets) {
        return
    }
    const snippetsOut = ensureDir(join(packageOutDir, "snippets"))
    for (const [filePath, fileSnippets] of Object.entries(
        packageMetadata.snippets
    )) {
        writeFileSnippets(snippetsOut, filePath, fileSnippets)
    }
}

const writeFileSnippets = (
    snippetsOut: string,
    filePath: string,
    fileSnippets: FileSnippets
) => {
    let outPath = filePath.startsWith("snippets/")
        ? filePath.slice(9)
        : join("root", filePath)
    outPath = outPath.replaceAll("/", "-")
    const allSnippetOutPath = join(snippetsOut, outPath)
    ensureDir(dirname(allSnippetOutPath))
    writeFile(allSnippetOutPath, fileSnippets.all.text)
    const labeledSnippetEntries = Object.entries(fileSnippets.byLabel)
    if (labeledSnippetEntries.length) {
        const labeledSnippetsOutDir = ensureDir(
            allSnippetOutPath.replace(".ts", "ByLabel")
        )
        for (const [label, snippet] of Object.entries(fileSnippets.byLabel)) {
            writeFile(join(labeledSnippetsOutDir, label + ".ts"), snippet.text)
        }
    }
}
