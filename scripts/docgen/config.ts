import {
    PackageSnippets,
    SnippetTransformToggleOptions
} from "./snippets/extractSnippets.js"

export type DocGenConfig = {
    packages: DocGenPackageConfig[]
}

export type DocGenPackageConfig = {
    path: string
    api: DocGenApiConfig
    snippets?: DocGenSnippetsConfig
}

export type DocGenApiConfig = {
    outDir: string
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
