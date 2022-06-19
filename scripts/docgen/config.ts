export type DocGenConfig = {
    packages: DocGenPackageConfig[]
}

export type DocGenPackageConfig = {
    name: string
    entryPoints: string[]
}
