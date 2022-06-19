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
    for (const packageMetadata of packages) {
        writePackageApi({ config, packageMetadata })
        writePackageSnippets({ config, packageMetadata })
    }
    shell(`prettier --write ${config.outDir}`)
}
