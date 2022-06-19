import { Project } from "ts-morph"

export type ExtractPackageSnippetsContext = {
    project: Project
    sources: string[]
}

export type PackageSnippet = {
    text: string
}

export const extractPackageSnippets = ({
    project,
    sources
}: ExtractPackageSnippetsContext): PackageSnippet[] => {
    return sources.map((source) => {
        const snippetSourceFile = project.addSourceFileAtPath(source)
        return { text: snippetSourceFile.getText() }
    })
}
