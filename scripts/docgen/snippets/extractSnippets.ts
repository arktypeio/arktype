import { Project } from "ts-morph"
import { DocGenConfig } from "../config.js"

export type ExtractPackageSnippetsContext = {
    config: DocGenConfig
    project: Project
    rootDir: string
}

export type PackageSnippet = {
    text: string
}

export const extractPackageSnippets = ({
    config,
    project,
    rootDir
}: ExtractPackageSnippetsContext): PackageSnippet[] => {
    console.log("Getting snippets... (/s)")
    return []
}
