import { rmSync } from "node:fs"
import { join } from "node:path"
import { shell } from "@re-/node"
import { writePackageApi } from "./api/writeApi.js"
import { DocGenConfig } from "./config.js"
import { PackageExtractionData } from "./extract.js"
import { writePackageSnippets } from "./snippets/writeSnippets.js"

export type WriteApiContext = {
    config: DocGenConfig
    packages: PackageExtractionData[]
}

export const writeRepo = ({ config, packages }: WriteApiContext) => {
    rmSync(config.outDir, { recursive: true, force: true })
    for (const packageConfig of config.packages) {
        const extractedPackageData = packages.find(
            (pkg) => packageConfig.path === pkg.metadata.name
        )
        if (!extractedPackageData) {
            throw new Error(
                `Unable to find metadata associated with '${packageConfig.path}'.`
            )
        }
        const packageOutDir = join(
            config.outDir,
            extractedPackageData.metadata.name
        )
        writePackageApi({
            config,
            extractedPackage: extractedPackageData,
            packageOutDir
        })
        writePackageSnippets({
            packageConfig,
            extractedPackage: extractedPackageData
        })
    }

    shell(`prettier --write ${config.outDir}`)
}
