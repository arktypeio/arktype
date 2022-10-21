import { rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import type { DocGenMappedDirsConfig } from "./main.js"
import type { SnippetsByPath } from "./snippets/extractSnippets.js"
import { ensureDir } from "@arktype/node"

export const mapDir = (
    snippetsByPath: SnippetsByPath,
    options: DocGenMappedDirsConfig
) => {
    const fileContentsByRelativeDestination = Object.entries(
        snippetsByPath
    ).map(([path, snippets]) => {
        let transformedContents = snippets.all.text
        if (options.transformContents) {
            transformedContents = options.transformContents(transformedContents)
        }
        return [
            options.transformRelativePaths
                ? options.transformRelativePaths(path)
                : path,
            transformedContents
        ]
    })
    rmSync(options.to, { recursive: true, force: true })
    for (const [path, contents] of fileContentsByRelativeDestination) {
        const resolvedPath = join(options.to, path)
        ensureDir(dirname(resolvedPath))
        writeFileSync(resolvedPath, contents)
    }
}
