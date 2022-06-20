import { dirname, join } from "node:path"
import { ensureDir, writeFile } from "@re-/node"
import { DocGenConfig } from "../config.js"
import { PackageMetadata } from "../extract.js"

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
    const filesOut = ensureDir(join(snippetsOut, "files"))
    const blocksOut = ensureDir(join(snippetsOut, "blocks"))
    for (const [path, snippet] of Object.entries(
        packageMetadata.snippets.files
    )) {
        const outPath = path.startsWith("snippets/")
            ? path.slice(9)
            : join("root", path)
        const snippetDestinationPath = join(filesOut, outPath)
        ensureDir(dirname(snippetDestinationPath))
        writeFile(snippetDestinationPath, snippet.text)
    }
    for (const [id, snippet] of Object.entries(
        packageMetadata.snippets.blocks
    )) {
        writeFile(join(blocksOut, id + ".ts"), snippet.text)
    }
}
