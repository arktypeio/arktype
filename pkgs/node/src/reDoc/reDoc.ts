import { mkdtempSync, rmSync } from "fs"
import { join, resolve } from "path"
import { TSDocParser, TSDocConfiguration } from "@microsoft/tsdoc"
import { TSDocConfigFile } from "@microsoft/tsdoc-config"
import { findPackageRoot, fromPackageRoot } from "../index.js"
import { analyzePackage } from "./analysis/index.js"
import { generateDocs } from "./generation/generateDocs.js"

export type PackageConfig = { rootDir: string; outputDir?: string }

export type GenerateDocsOptions = {
    packages?: PackageConfig[]
    baseOutputDir?: string
}

export const reDoc = (options: GenerateDocsOptions = {}) => {
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

export const getReDocContext = (options: GenerateDocsOptions) => {
    const cwd = process.cwd()
    const packageConfigs = options.packages ?? [
        { rootDir: findPackageRoot(cwd) }
    ]
    const baseOutputDir = options.baseOutputDir ?? join(cwd, "docs")
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
        tsDocLoadedConfiguration
    }
}
