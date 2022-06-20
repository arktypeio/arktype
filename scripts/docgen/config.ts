import { PackageSnippets } from "./snippets/extractSnippets.js"

export type DocGenConfig = {
    packages: DocGenPackageConfig[]
    outDir: string
}

export type DocGenPackageConfig = {
    path: string
    snippets?: DocGenSnippetsConfig
}

export type DocGenSnippetsConfig = {
    sources: string[]
    targets?: string[]
    consumers?: DocGenSnippetConsumer[]
}

export type DocGenSnippetConsumer = (snippets: PackageSnippets) => void
