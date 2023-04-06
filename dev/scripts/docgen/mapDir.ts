import { rmSync, writeFileSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import * as process from "node:process"
import {
    ensureDir,
    fileName,
    shell,
    walkPaths,
    writeJson
} from "../../runtime/main.js"
import { repoDirs } from "../common.js"
import type { DocGenMappedDirsConfig } from "./main.js"
import type { SnippetsByPath } from "./snippets/extractSnippets.js"

export const mapDir = (
    snippetsByPath: SnippetsByPath,
    options: DocGenMappedDirsConfig
) => {
    const fileContentsByRelativeDestination = options.sources.flatMap(
        (sourceDir) =>
            walkPaths(sourceDir, {
                ...options.sourceOptions,
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
    for (const target of options.targets) {
        const sourceMapData: Record<string, string> = {
            "//": `This directory was generated from the following files (see ${relative(
                repoDirs.root,
                fileName()
            )} for details)`
        }
        const sourceMapPath = join(target, ".docgenSources.json")
        rmSync(target, { recursive: true, force: true })
        const isBuildProcess = process.argv.some((arg) => /build.ts/.test(arg))
        for (const [
            path,
            contents,
            source
        ] of fileContentsByRelativeDestination) {
            sourceMapData[path] = source
            const resolvedPath = join(target, isBuildProcess ? source : path)
            ensureDir(dirname(resolvedPath))
            writeFileSync(resolvedPath, contents)
        }
        if (!options.skipFormatting) {
            shell(`prettier --write ${target}`)
        }
        if (!options.skipSourceMap) {
            writeJson(sourceMapPath, sourceMapData)
        }
    }
}
