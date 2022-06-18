import { mkdtempSync, rmSync } from "node:fs"
import { join, resolve } from "node:path"
import { TSDocConfiguration, TSDocParser } from "@microsoft/tsdoc"
import { TSDocConfigFile } from "@microsoft/tsdoc-config"
import { findPackageRoot, fromPackageRoot } from "@re-/node"
import { analyzePackage } from "./analysis/index.js"
import { generateDocs } from "./generation/generateDocs.js"

export type PackageConfig = { rootDir: string; outputDir?: string }

export type ReDocOptions = {
    packages?: PackageConfig[]
    baseOutputDir?: string
    rewriteExternalImports?: (packageName: string, memberName: string) => string
    excludeIndexMd?: boolean
}

export const reDoc = (options: ReDocOptions = {}) => {
    const ctx = getReDocContext(options)
    console.group(
        `reDoc: Generating docs for ${ctx.packageConfigs.length} package(s)...✍️`
    )
    try {
        const analyzedPackages = ctx.packageConfigs.map(({ rootDir }) =>
            analyzePackage(rootDir, ctx)
        )
        generateDocs(analyzedPackages, ctx)
    } finally {
        rmSync(ctx.tempDir, { recursive: true, force: true })
    }
    console.log(`reDoc: Enjoy your new docs! 📚`)
    console.groupEnd()
}

export type ReDocContext = ReturnType<typeof getReDocContext>

export const getReDocContext = (options: ReDocOptions) => {
    const cwd = process.cwd()
    const packageConfigs = options.packages ?? [
        { rootDir: findPackageRoot(cwd) }
    ]
    const baseOutputDir = options.baseOutputDir ?? join(cwd, "docs")
    const rewriteExternalImports = options.rewriteExternalImports
    const excludeIndexMd = options.excludeIndexMd ?? false
    const tempDir = resolve(mkdtempSync("reDoc"))
    // The tsdoc.json in @re-/node
    const tsDocConfigPath = fromPackageRoot("tsdoc.json")
    const tsDocConfiguration = new TSDocConfiguration()
    const tsDocLoadedConfiguration = TSDocConfigFile.loadFile(tsDocConfigPath)
    tsDocLoadedConfiguration.configureParser(tsDocConfiguration)
    const tsDocParser = new TSDocParser(tsDocConfiguration)
    return {
        packageConfigs,
        baseOutputDir,
        tempDir,
        tsDocParser,
        tsDocLoadedConfiguration,
        rewriteExternalImports,
        excludeIndexMd
    }
}
