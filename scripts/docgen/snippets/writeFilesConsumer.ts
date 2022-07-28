import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { DocGenSnippetConsumer } from "../config.js"

export type CreateWriteFilesConsumerOptions = {
    rootOutDir: string
    transformFileName?: (name: string) => string
}

export const createWriteFilesConsumer =
    (options: CreateWriteFilesConsumerOptions): DocGenSnippetConsumer =>
    (snippets) => {
        const obj = Object.fromEntries(
            Object.entries(snippets).map(([path, fileSnippets]) => [
                options.transformFileName
                    ? options.transformFileName(path)
                    : path,
                fileSnippets.all.text
            ])
        )
        for (const snippet of Object.keys(obj)) {
            writeFileSync(
                `${join(options.rootOutDir, "generated", snippet)}`,
                obj[snippet]
            )
        }
    }
