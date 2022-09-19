import { join } from "node:path"
import { Project } from "ts-morph"
import type { PackageJson } from "type-fest"
import type { ApiEntryPoint } from "./api/index.js"
import { extractPackageApi } from "./api/index.js"
import type { DocGenConfig } from "./config.js"
import type { PackageSnippets } from "./snippets/index.js"
import { extractPackageSnippets } from "./snippets/index.js"
import { fromHere, readPackageJson } from "@re-/node"

const REPO_ROOT = fromHere("..", "..")

export type PackageExtractionData = {
    metadata: PackageMetadata
    api: ApiEntryPoint[]
    snippets: PackageSnippets
}

export type PackageMetadata = {
    name: string
    version: string
    rootDir: string
    packageJsonData: PackageJson
}

export const extractRepo = (config: DocGenConfig): PackageExtractionData[] => {
    const project = new Project({
        tsConfigFilePath: join(REPO_ROOT, "tsconfig.references.json"),
        skipAddingFilesFromTsConfig: true
    })
    return config.packages.map((packageConfig) => {
        const rootDir = join(REPO_ROOT, packageConfig.path)
        const packageJsonData: PackageJson = readPackageJson(rootDir)
        const packageMetadata: PackageMetadata = {
            name: packageJsonData.name!,
            version: packageJsonData.version!,
            rootDir,
            packageJsonData
        }
        const api = extractPackageApi({
            project,
            packageJson: packageJsonData,
            rootDir
        })
        const extractedPackage: PackageExtractionData = {
            metadata: packageMetadata,
            api,
            snippets: {}
        }
        if (packageConfig.snippets) {
            const sources = packageConfig.snippets.sources.map(
                ({ path, ...rest }) => {
                    return { path: join(rootDir, path), ...rest }
                }
            )
            extractedPackage.snippets = extractPackageSnippets({
                project,
                sources,
                packageMetadata
            })
        }
        return extractedPackage
    })
}
