import { join } from "node:path"
import { fromHere, readPackageJson } from "@re-/node"
import { Project } from "ts-morph"
import { PackageJson } from "type-fest"
import { ApiEntryPoint, extractPackageApi } from "./api/index.js"
import { DocGenConfig } from "./config.js"
import { extractPackageSnippets, PackageSnippets } from "./snippets/index.js"

const REPO_ROOT = fromHere("..", "..")

export type PackageMetadata = {
    name: string
    version: string
    rootDir: string
    api: ApiEntryPoint[]
    snippets?: PackageSnippets
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
        const packageMetadata: PackageMetadata = { name, version, rootDir, api }
        if (packageConfig.snippets) {
            const sources = packageConfig.snippets.sources.map((sourceGlob) =>
                join(rootDir, sourceGlob)
            )
            packageMetadata.snippets = extractPackageSnippets({
                project,
                sources,
                rootDir
            })
        }
        return packageMetadata
    })
}
