import { readFileSync, rmSync, writeFileSync } from "fs"
import { basename, dirname, join } from "path"
import { parseConfigFileTextToJson } from "typescript"
import {
    findPackageRoot,
    walkPaths,
    fromDir,
    readJson,
    mapFilesToContents,
    ensureDir,
    readFile
} from "./fs.js"
import { shellAsync } from "./shell.js"
import ts from "typescript"
import {
    DefaultMergeOptions,
    Iteration,
    Merge,
    merge,
    MergeOptions,
    Narrow
} from "@re-do/utils"

export type MergeAll<
    Objects,
    Options extends MergeOptions = DefaultMergeOptions,
    Result extends object = {}
> = Objects extends Iteration<any, infer Current, infer Remaining>
    ? MergeAll<Remaining, Merge<Result, Current, Options>>
    : Result

export const mergeAll = <
    Objects extends object[],
    Options extends MergeOptions = DefaultMergeOptions
>(
    objects: Narrow<Objects>,
    options?: Options
): MergeAll<Objects, Options> =>
    (objects.length
        ? merge(objects[0], mergeAll(objects.slice(1), options), options)
        : {}) as MergeAll<Objects>

export type TranspileTsOptions = ts.CompilerOptions & {
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
        const outFilePath = path.replace(srcDir, outDir).replace(".ts", ".js")
        const options = mergeAll(
            [
                readJson(baseTsConfig).compilerOptions,
                readJson(tsConfig).compilerOptions,
                tsOptions
            ],
            { deep: true }
        )
        const transpiled = ts.transpile(sourceContents[path], options)
        ensureDir(dirname(outFilePath))
        writeFileSync(outFilePath, transpiled)
    })

    // await shellAsync("npx tsc --module esnext --outDir out/esm", {
    //     cwd: pkgRoot
    // })
    // await shellAsync("npx tsc --module commonjs --outDir out/cjs", {
    //     cwd: pkgRoot
    // })
    // await shellAsync(
    //     "npx tsc --declaration --emitDeclarationOnly --outDir out/types"
    // )
}
