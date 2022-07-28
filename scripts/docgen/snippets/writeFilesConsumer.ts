import { ensureDir } from "@re-/node"
import { rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { DocGenSnippetConsumer } from "../config.js"

export type CreateWriteFilesConsumerOptions = {
    rootOutDir: string
    transformRelativePath?: (path: string) => string
}

export const createWriteFilesConsumer =
    (options: CreateWriteFilesConsumerOptions): DocGenSnippetConsumer =>
    (snippets) => {
        const snippetsByRelativeOutPath = Object.entries(snippets).map(
            ([path, fileSnippets]) => [
                options.transformRelativePath
                    ? options.transformRelativePath(path)
                    : path,
                fileSnippets.all.text
            ]
        )

        for (const [path, snippet] of snippetsByRelativeOutPath) {
            const outDir = dirname(path)
            rmSync(outDir, { recursive: true, force: true })
            ensureDir(outDir)
            writeFileSync(path, snippet)
        }
    }
