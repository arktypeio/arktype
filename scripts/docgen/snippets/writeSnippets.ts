import { DocGenConfig } from "../config.js"
import { PackageMetadata } from "../extract.js"
import { PackageSnippet } from "./extractSnippets.js"

export type WriteSnippetsContext = {
    config: DocGenConfig
    packageMetadata: PackageMetadata
}

export const writePackageSnippets = ({
    config,
    packageMetadata
}: WriteSnippetsContext): PackageSnippet[] => {
    console.log("Getting snippets... (/s)")
    return []
}
