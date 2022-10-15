import { rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { ensureDir } from "@arktype/node"
import type { DocGenSnippetConsumer } from "../config.js"

export type CreateWriteFilesConsumerOptions = {
    rootOutDir: string
    transformRelativePath?: (path: string) => string
    transformJsImports?: (snippet: string) => string
}

export const createWriteFilesConsumer =
    (options: CreateWriteFilesConsumerOptions): DocGenSnippetConsumer =>
    (snippets) => {
        const snippetsByRelativeOutPath = Object.entries(snippets).map(
            ([path, fileSnippets]) => [
                options.transformRelativePath
                    ? options.transformRelativePath(path)
                    : path,
                options.transformJsImports
                    ? options.transformJsImports(fileSnippets.all.text)
                    : fileSnippets.all.text
            ]
        )

        rmSync(options.rootOutDir, { recursive: true, force: true })
        for (const [path, snippet] of snippetsByRelativeOutPath) {
            const resolvedPath = join(options.rootOutDir, path)
            ensureDir(dirname(resolvedPath))
            writeFileSync(resolvedPath, snippet)
        }
    }
