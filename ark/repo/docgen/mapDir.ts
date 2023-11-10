import { rm, rmSync, writeFileSync } from "node:fs"
import { dirname, join, relative, sep } from "node:path"
import * as process from "node:process"
import { ensureDir, fileName, shell, walkPaths, writeJson } from "@arktype/fs"
import { repoDirs } from "../shared.ts"
import type { DocGenMappedDirsConfig } from "./docgen.ts"
import type { SnippetsByPath } from "./snippets/extractSnippets.ts"

export const mapDir = (
	snippetsByPath: SnippetsByPath,
	options: DocGenMappedDirsConfig
) => {
	const fileContentsByRelativeDestination = options.sources.flatMap(
		(sourceDir) =>
			walkPaths(sourceDir, {
				...options.sourceOptions,
				excludeDirs: true,
				ignoreDirsMatching: /(node_modules)/
			}).map((sourceFilePath) => {
				const sourceRelativePath = relative(sourceDir, sourceFilePath)
					.split(sep)
					.join("/")
				const repoRelativePath = relative(repoDirs.root, sourceFilePath)
					.split(sep)
					.join("/")
				if (!(repoRelativePath in snippetsByPath)) {
					throw new Error(`Expected to find ${repoRelativePath} in snippets.`)
				}
				let transformedContents = snippetsByPath[repoRelativePath].all.text
				if (options.transformContents) {
					transformedContents = options.transformContents(transformedContents)
				}
				let transformedOutputPath = sourceRelativePath
				if (options.transformOutputPaths) {
					transformedOutputPath = options.transformOutputPaths(
						transformedOutputPath
					)
				}
				return [transformedOutputPath, transformedContents, repoRelativePath]
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
		if (process.platform === "win32") {
			//with rmSync Windows throws ENOTEMPTY and does not delete the files until the process exits
			rm(target, () => console.log())
		} else {
			rmSync(target, { recursive: true, force: true })
		}
		const isBuildProcess = process.argv.some((arg) => /build.ts/.test(arg))
		for (const [path, contents, source] of fileContentsByRelativeDestination) {
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
