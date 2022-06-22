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
    for (const packageConfig of config.packages) {
        const extractedPackageData = packages.find(
            (pkg) => packageConfig.path === pkg.metadata.name
        )
        if (!extractedPackageData) {
            throw new Error(
                `Unable to find metadata associated with '${packageConfig.path}'.`
            )
        }
        writePackageApi({
            packageApiConfig: packageConfig.api,
            extractedPackage: extractedPackageData
        })
        writePackageSnippets({
            packageConfig,
            extractedPackage: extractedPackageData
        })
        // shell("pnpm build-gh-pages")
    }
}
