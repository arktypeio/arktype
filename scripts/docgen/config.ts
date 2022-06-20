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
}
