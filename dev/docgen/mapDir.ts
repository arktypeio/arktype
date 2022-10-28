import { rmSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { ensureDir, shell, walkPaths } from "@arktype/runtime"
import { repoDirs } from "../common.js"
import { fromPackageRoot, writeJson } from "../runtime/src/fs.js"
import type { DocGenMappedDirsConfig } from "./main.js"
import type { SnippetsByPath } from "./snippets/extractSnippets.js"

// eslint-disable-next-line max-lines-per-function
export const mapDir = (
    snippetsByPath: SnippetsByPath,
    options: DocGenMappedDirsConfig
) => {
    const fileContentsByRelativeDestination = options.sources.flatMap(
        (sourceDir) =>
            walkPaths(sourceDir, {
                excludeDirs: true
            }).map((sourceFilePath) => {
                const sourceRelativePath = relative(sourceDir, sourceFilePath)
                const repoRelativePath = relative(repoDirs.root, sourceFilePath)
                if (!(repoRelativePath in snippetsByPath)) {
                    throw new Error(
                        `Expected to find ${repoRelativePath} in snippets.`
                    )
                }
                let transformedContents =
                    snippetsByPath[repoRelativePath].all.text
                if (options.transformContents) {
                    transformedContents =
                        options.transformContents(transformedContents)
                }
                let transformedOutputPath = sourceRelativePath
                if (options.transformOutputPaths) {
                    transformedOutputPath = options.transformOutputPaths(
                        transformedOutputPath
                    )
                }
                return [
                    transformedOutputPath,
                    transformedContents,
                    repoRelativePath
                ]
            })
    )
    const mappedContents = []
    for (const target of options.targets) {
        rmSync(target, { recursive: true, force: true })
        for (const [
            path,
            contents,
            source
        ] of fileContentsByRelativeDestination) {
            const resolvedPath = join(target, path)
            mappedContents.push({ source, generated: resolvedPath })
            writeJson("./.docgenSourceMap.json", mappedContents)
            ensureDir(dirname(resolvedPath))
            writeFileSync(resolvedPath, contents)
        }
        shell(`prettier --write ${target}`)
    }
}
