import { join, relative } from "node:path"
import type { WalkOptions } from "../runtime/api.js"
import { findPackageRoot, readPackageJson, walkPaths } from "../runtime/api.js"

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

export const inFileFilter: WalkOptions = {
    ignoreDirsMatching: /__tests__/,
    include: (path) => tsFileMatcher.test(path)
}

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
    const srcFiles = walkPaths(srcRoot, inFileFilter)
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
        srcFiles
    }
}
