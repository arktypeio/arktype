import { writeFileSync } from "fs"
import { basename, dirname, join } from "path"
import {
    findPackageRoot,
    walkPaths,
    fromDir,
    readJson,
    mapFilesToContents,
    ensureDir
} from "./fs.js"
import ts, { ParseConfigFileHost } from "typescript"
import { mergeAll, toString } from "@re-do/utils"

export type TsConfig = {
    [K in keyof ts.CompilerOptions]: any
}

export type TranspileTsOptions = TsConfig & {
    packageRoot?: string
    toDir?: string
}

export const findPackageName = (rootPath?: string) => {
    return readJson(
        fromDir(rootPath ?? findPackageRoot(process.cwd()))("package.json")
    ).name
}

export type GetTsSourcesOptions = {
    includeTests?: boolean
}

export const isTest = (path: string) =>
    basename(path).includes(".stories.") || path.includes("__tests__")

export const getTsSources = (
    srcDir: string,
    { includeTests }: GetTsSourcesOptions = {}
) =>
    walkPaths(srcDir, {
        exclude: (path) => (includeTests ? false : isTest(path)),
        include: (path) => !!path.match(/\.tsx?$/),
        excludeDirs: true
    })

export const transpileTs = async ({
    packageRoot,
    toDir,
    ...tsOptions
}: TranspileTsOptions = {}) => {
    const pkgRoot = packageRoot ?? findPackageRoot(process.cwd())
    const srcDir = join(pkgRoot, "src")
    const outDir = toDir ?? join(pkgRoot, "out")
    const tsConfig = join(pkgRoot, "tsconfig.json")
    const baseTsConfig = join(findPackageRoot(), "tsconfig.base.json")
    const sources = getTsSources(srcDir)
    const sourceContents = mapFilesToContents(sources)
    const fakeParseConfigHost: ParseConfigFileHost = {
        getCurrentDirectory: () => pkgRoot,
        useCaseSensitiveFileNames: false,
        readDirectory: (...args: any[]) => [],
        fileExists: () => false,
        readFile: () => "",
        onUnRecoverableConfigFileDiagnostic: (e) => {
            throw new Error(toString(e))
        }
    }

    sources.forEach((path) => {
        const outFilePath = path
            .replace(srcDir, outDir)
            .replace(".ts", tsOptions.module === "commonjs" ? ".cjs" : ".js")
        const options: TsConfig = mergeAll(
            [
                readJson(baseTsConfig),
                readJson(tsConfig),
                { compilerOptions: tsOptions }
            ],
            { deep: true }
        )
        if (!path.endsWith(".tsx")) {
            delete options.compilerOptions.jsx
        }
        const parsedConfigOptions = ts.parseJsonConfigFileContent(
            options,
            fakeParseConfigHost,
            pkgRoot
        ).options
        let transpiled = ts.transpile(sourceContents[path], parsedConfigOptions)
        if (tsOptions.module === "commonjs") {
            transpiled = transpiled.replace(
                /require\("\.\.?\/.*\.js"\)/g,
                (match) => match.replace(".js", ".cjs")
            )
        }
        ensureDir(dirname(outFilePath))
        writeFileSync(outFilePath, transpiled)
    })
}
