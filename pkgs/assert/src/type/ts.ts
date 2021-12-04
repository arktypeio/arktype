import { findPackageRoot, mapFilesToContents } from "@re-do/node"
import { dirname, join } from "path"
import typescript from "typescript"
import { memoize } from "@re-do/utils"
import { listImporters } from "../imports.js"

// Absolute file paths TS will parse to raw contents
export type ContentsByFile = Record<string, string>

export type TsContext = {
    ts: typescript.Program
    sources: ContentsByFile
}

export type TypeContextOptions = {
    tsConfig?: string
    sourcePaths?: string[]
}

export const getTsContext = memoize(
    (options: TypeContextOptions = {}): TsContext => {
        const { tsConfig, sourcePaths } = withDefaultTypeContextOptions(options)
        const sources = mapFilesToContents(sourcePaths)
        const ts = typescript.createProgram({
            rootNames: Object.keys(sources),
            options: compileTsOptions(tsConfig)
        })
        return {
            sources,
            ts
        }
    }
)

const withDefaultTypeContextOptions = (options: TypeContextOptions) => {
    const packageRoot = findPackageRoot(process.cwd())
    const tsConfig = options.tsConfig ?? join(packageRoot, "tsconfig.json")
    const sourcePaths = options.sourcePaths ?? listImporters()
    return { tsConfig, sourcePaths }
}

const compileTsOptions = (configPath: string) => {
    return typescript.parseJsonSourceFileConfigFileContent(
        typescript.readJsonConfigFile(configPath, typescript.sys.readFile),
        typescript.sys,
        dirname(configPath)
    ).options
}
