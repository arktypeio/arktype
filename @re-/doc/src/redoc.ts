export type PackageConfig = { rootDir: string; outputDir?: string }

export type ReDocOptions = {
    packages?: PackageConfig[]
    baseOutputDir?: string
    rewriteExternalImports?: (packageName: string, memberName: string) => string
}

export const redoc = (options: ReDocOptions = {}) => {
    console.group(`reDoc: Generating docs for ${1} package(s)...✍️`)

    console.log(`reDoc: Enjoy your new docs! 📚`)
    console.groupEnd()
}
