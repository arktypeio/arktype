import { findPackageRoot, mapFilesToContents } from "@re-/tools/node"
import { dirname, join, relative } from "path"
import typescript from "typescript"
import { memoize, print, toString } from "@re-/tools"

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
        const { tsOptions, sourcePaths } = getConfig(options)
        const packageRoot = findPackageRoot(process.cwd())
        console.log(
            `Analyzing types for ${toString(
                sourcePaths.map((fullPath) => relative(packageRoot, fullPath))
            )}.
If you see this message more than once,
you may want to reconfigure your test environment to
ensure context can be shared across tests.`
        )
        const sources = mapFilesToContents(sourcePaths)
        const ts = typescript.createProgram({
            rootNames: sourcePaths,
            options: tsOptions
        })
        return {
            sources,
            ts
        }
    }
)

const getConfig = (options: TypeContextOptions) => {
    const packageRoot = findPackageRoot(process.cwd())
    const tsConfig = options.tsConfig ?? join(packageRoot, "tsconfig.json")
    const parsedConfig = compileTsConfig(tsConfig)
    const sourcePaths = options.sourcePaths ?? parsedConfig.fileNames
    return { tsOptions: parsedConfig.options, sourcePaths }
}

const compileTsConfig = (configPath: string) => {
    const config = typescript.parseJsonSourceFileConfigFileContent(
        typescript.readJsonConfigFile(configPath, typescript.sys.readFile),
        typescript.sys,
        dirname(configPath)
    )
    config.options.noErrorTruncation = true
    return config
}
