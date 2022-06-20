import { join } from "node:path"
import { fromHere, readPackageJson } from "@re-/node"
import { Project } from "ts-morph"
import { PackageJson } from "type-fest"
import { ApiEntryPoint, extractPackageApi } from "./api/index.js"
import { DocGenConfig } from "./config.js"
import { extractPackageSnippets, SnippetMap } from "./snippets/index.js"

const REPO_ROOT = fromHere("..", "..")

export type PackageMetadata = {
    name: string
    version: string
    api: ApiEntryPoint[]
    snippets: SnippetMap
}

export const extractRepo = (config: DocGenConfig): PackageMetadata[] => {
    const project = new Project({
        tsConfigFilePath: join(REPO_ROOT, "tsconfig.references.json"),
        skipAddingFilesFromTsConfig: true
    })
    return config.packages.map((packageConfig) => {
        const rootDir = join(REPO_ROOT, packageConfig.path)
        const packageJson: PackageJson = readPackageJson(rootDir)
        const name = packageJson.name!
        const version = packageJson.version!
        const api = extractPackageApi({
            project,
            packageJson,
            rootDir
        })
        let snippets: SnippetMap = {}
        if (packageConfig.snippets) {
            const sources = packageConfig.snippets.sources.map((sourceGlob) =>
                join(rootDir, sourceGlob)
            )
            snippets = extractPackageSnippets({
                project,
                sources,
                rootDir
            })
        }
        return { name, version, api, snippets }
    })
}
