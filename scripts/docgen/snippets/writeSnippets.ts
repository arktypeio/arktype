import { join } from "node:path"
import { writeJson } from "@re-/node"
import { DocGenConfig } from "../config.js"
import { PackageMetadata } from "../extract.js"

export type WriteSnippetsContext = {
    config: DocGenConfig
    packageMetadata: PackageMetadata
}

export const writePackageSnippets = ({
    config,
    packageMetadata
}: WriteSnippetsContext) => {
    writeJson(join(config.outDir, "snippets.json"), packageMetadata.snippets)
}
