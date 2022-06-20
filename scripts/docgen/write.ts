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
    for (const packageMetadata of packages) {
        const packageOutDir = join(config.outDir, packageMetadata.name)
        writePackageApi({ config, packageMetadata, packageOutDir })
        writePackageSnippets({ config, packageMetadata, packageOutDir })
    }
    shell(`prettier --write ${config.outDir}`)
}
