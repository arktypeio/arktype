import { rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import type { DocGenSnippetConsumer } from "../config.js"
import { ensureDir } from "@arktype/node"

export type CreateWriteFilesConsumerOptions = {
    rootOutDir: string
    transformRelativePath?: (path: string) => string
    transformJsImports?: (snippet: string) => string
    transformContents?: (content: string) => string
}

export const createWriteFilesConsumer =
    (options: CreateWriteFilesConsumerOptions): DocGenSnippetConsumer =>
    (snippets) => {
        const snippetsByRelativeOutPath = Object.entries(snippets).map(
            ([path, fileSnippets]) => {
                let transformedContents = fileSnippets.all.text
                if (options.transformJsImports) {
                    transformedContents =
                        options.transformJsImports(transformedContents)
                }
                if (options.transformContents) {
                    transformedContents =
                        options.transformContents(transformedContents)
                }
                return [
                    options.transformRelativePath
                        ? options.transformRelativePath(path)
                        : path,
                    transformedContents
                ]
            }
        )

        rmSync(options.rootOutDir, { recursive: true, force: true })
        for (const [path, snippet] of snippetsByRelativeOutPath) {
            const resolvedPath = join(options.rootOutDir, path)
            ensureDir(dirname(resolvedPath))
            writeFileSync(resolvedPath, snippet)
        }
    }
