import { join } from "node:path"
import { ensureDir, writeFile } from "@re-/node"
import { EntryPointData, RepoMetadata } from "./extract.js"

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
}

export const writeEntryPoint = (
    entryPoint: EntryPointData,
    entryPointOutDir: string
) => {
    for (const exported of entryPoint.exports) {
        const mdFilePath = join(entryPointOutDir, `${exported.name}.json`)
        writeFile(mdFilePath, JSON.stringify(exported))
    }
}
