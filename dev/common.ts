import { join, relative } from "node:path"
import {
    findPackageRoot,
    readPackageJson,
    walkPaths
} from "./runtime/src/api.js"

const root = findPackageRoot()
const dev = join(root, "dev")
const arktypeIo = join(dev, "arktype.io")
const docsDir = join(arktypeIo, "docs")

export const repoDirs = {
    root,
    dev,
    arktypeIo,
    docsDir
}

export const isProd = () => process.argv.includes("--prod") || !!process.env.CI

export const tsFileMatcher = /^.*\.(c|m)?tsx?$/

export const getPackageDataFromCwd = () => {
    const cwd = process.cwd()
    const packageRoot = findPackageRoot(cwd)
    const packageJson = readPackageJson(packageRoot)
    const packageName = packageJson.name
    const tsConfig = relative(cwd, join(packageRoot, "tsconfig.json"))
    const srcRoot = relative(cwd, join(packageRoot, "src"))
    const outRoot = relative(cwd, join(packageRoot, "dist"))
    const typesOut = join(outRoot, "types")
    const mjsOut = join(outRoot, "mjs")
    const cjsOut = join(outRoot, "cjs")
    const inFiles = walkPaths(srcRoot, {
        ignoreDirsMatching: /__tests__|__snippets__/,
        include: (path) => tsFileMatcher.test(path)
    })
    return {
        packageRoot,
        packageJson,
        packageName,
        tsConfig,
        srcRoot,
        outRoot,
        typesOut,
        mjsOut,
        cjsOut,
        inFiles
    }
}
