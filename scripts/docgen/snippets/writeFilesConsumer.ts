import { DocGenSnippetConsumer } from "../config.js"

export type CreateWriteFilesConsumerOptions = {
    rootOutDir: string
    transformFileName?: (name: string) => string
}

export const createWriteFilesConsumer =
    (options: CreateWriteFilesConsumerOptions): DocGenSnippetConsumer =>
    (snippets) => {
        Object.fromEntries(
            Object.entries(snippets).map(([path, fileSnippets]) => [
                path,
                fileSnippets.all.text
            ])
        )
        // Write all files to options.rootOutDir, add options for transform file name (in this case we want to add .raw)
        // Should write the files and return nothing
    }
