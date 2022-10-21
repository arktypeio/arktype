import { rmSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import type { DocGenMappedDirsConfig } from "./main.js"
import { config } from "./main.js"
import type { SnippetsByPath } from "./snippets/extractSnippets.js"
import { ensureDir, walkPaths } from "@arktype/node"

// eslint-disable-next-line max-lines-per-function
export const mapDir = (
    snippetsByPath: SnippetsByPath,
    options: DocGenMappedDirsConfig
) => {
    const fileContentsByRelativeDestination = options.sources.flatMap(
        (source) =>
            walkPaths(source, {
                excludeDirs: true
            }).map((sourcePath) => {
                const relativeSourcePath = relative(
                    config.dirs.repoRoot,
                    sourcePath
                )
                if (!(relativeSourcePath in snippetsByPath)) {
                    throw new Error(
                        `Expected to find ${relativeSourcePath} in snippets.`
                    )
                }
                let transformedContents =
                    snippetsByPath[relativeSourcePath].all.text
                if (options.transformContents) {
                    transformedContents =
                        options.transformContents(transformedContents)
                }
                return [
                    options.transformRelativePaths
                        ? options.transformRelativePaths(relativeSourcePath)
                        : relativeSourcePath,
                    transformedContents
                ]
            })
    )
    for (const target of options.targets) {
        rmSync(target, { recursive: true, force: true })
        for (const [path, contents] of fileContentsByRelativeDestination) {
            const resolvedPath = join(target, path)
            ensureDir(dirname(resolvedPath))
            writeFileSync(resolvedPath, contents)
        }
    }
}
