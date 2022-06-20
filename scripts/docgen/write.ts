import { rmSync } from "node:fs"
import { join } from "node:path"
import { shell } from "@re-/node"
import { writePackageApi } from "./api/writeApi.js"
import { DocGenConfig } from "./config.js"
import { PackageMetadata } from "./extract.js"
import { writePackageSnippets } from "./snippets/writeSnippets.js"

export type WriteApiContext = {
    config: DocGenConfig
    packages: PackageMetadata[]
}

export const writeRepo = ({ config, packages }: WriteApiContext) => {
    rmSync(config.outDir, { recursive: true, force: true })
    for (const packageConfig of config.packages) {
        const packageMetadata = packages.find(
            (pkg) => packageConfig.path === pkg.name
        )
        if (!packageMetadata) {
            throw new Error(
                `Unable to find metadata associated with '${packageConfig.path}'.`
            )
        }
        const packageOutDir = join(config.outDir, packageMetadata.name)
        writePackageApi({ config, packageMetadata, packageOutDir })
        writePackageSnippets({ packageConfig, packageMetadata })
    }

    shell(`prettier --write ${config.outDir}`)
}
