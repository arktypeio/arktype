import {
    PackageSnippets,
    SnippetTransformToggleOptions
} from "./snippets/extractSnippets.js"

export type DocGenConfig = {
    packages: DocGenPackageConfig[]
    outDir: string
}

export type DocGenPackageConfig = {
    path: string
    snippets?: DocGenSnippetsConfig
}

export type DocGenSnippetsConfig = {
    sources: DocGenSnippetExtractionConfig[]
    targets?: string[]
    consumers?: DocGenSnippetConsumer[]
}

export type DocGenSnippetExtractionConfig = {
    fileGlob: string
    transforms?: SnippetTransformToggleOptions
}

export type DocGenSnippetConsumer = (snippets: PackageSnippets) => void
