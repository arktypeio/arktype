import { PackageMetadata } from "../extract.js"
import { PackageSnippets } from "./index.js"

// New function (same API as TS extraction but with plain text, assumes statement is next line)
export const extractTextSnippets = (
    paths: string[],
    packageMetadata: PackageMetadata
): PackageSnippets => {
    return {} as any
}
