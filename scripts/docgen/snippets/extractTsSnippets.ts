import { Project } from "ts-morph"
import { PackageMetadata } from "../extract.js"
import { PackageSnippets } from "./index.js"

// New function (do all the stuff we do now to extract snippets)
export const extractTsSnippets = (
    paths: string[],
    packageMetadata: PackageMetadata,
    project: Project
): PackageSnippets => {
    return {} as any
}
