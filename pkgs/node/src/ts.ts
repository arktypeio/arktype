import { writeFileSync } from "fs"
import { dirname, join } from "path"
import {
    findPackageRoot,
    walkPaths,
    fromDir,
    readJson,
    mapFilesToContents,
    ensureDir
} from "./fs.js"
import ts from "typescript"
import { mergeAll } from "@re-do/utils"

export type TranspileTsOptions = Record<keyof ts.CompilerOptions, any> & {
    packageRoot?: string
    toDir?: string
}

export const findPackageName = (rootPath?: string) => {
    return readJson(
        fromDir(rootPath ?? findPackageRoot(process.cwd()))("package.json")
    ).name
}

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
    const sources = walkPaths(srcDir, {
        exclude: (path) => !!path.match(/__tests__|\.stories\.tsx$/),
        include: (path) => !!path.match(/\.tsx?$/),
        excludeDirs: true
    })
    const sourceContents = mapFilesToContents(sources)
    sources.forEach((path) => {
        const outFilePath = path
            .replace(srcDir, outDir)
            .replace(".ts", tsOptions.module === "commonjs" ? ".cjs" : ".js")
        const options = mergeAll(
            [
                readJson(baseTsConfig).compilerOptions,
                readJson(tsConfig).compilerOptions,
                tsOptions
            ],
            { deep: true }
        )
        let transpiled = ts.transpile(sourceContents[path], options)
        if (tsOptions.module === "commonjs") {
            transpiled = transpiled.replace(
                /require\("\.\/.*\.js"\)/g,
                (match) => match.replace(".js", ".cjs")
            )
        }
        ensureDir(dirname(outFilePath))
        writeFileSync(outFilePath, transpiled)
    })
}
