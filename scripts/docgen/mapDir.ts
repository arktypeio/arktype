import { rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import type { DocGenMappedDirsConfig } from "./main.js"
import type { SnippetsByPath } from "./snippets/extractSnippets.js"
import { ensureDir, walkPaths } from "@arktype/node"

export const mapDir = (
    snippetsByPath: SnippetsByPath,
    options: DocGenMappedDirsConfig
) => {
    const fileContentsByRelativeDestination = walkPaths(options.from, {
        excludeDirs: true
    }).map((sourcePath) => {
        if (!(sourcePath in snippetsByPath)) {
            throw new Error(`Expected to find ${sourcePath} in snippets.`)
        }
        let transformedContents = snippetsByPath[sourcePath].all.text
        if (options.transformContents) {
            transformedContents = options.transformContents(transformedContents)
        }
        return [
            options.transformRelativePaths
                ? options.transformRelativePaths(sourcePath)
                : sourcePath,
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
