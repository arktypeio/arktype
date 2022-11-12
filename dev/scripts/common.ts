import { join, relative } from "node:path"
import type { WalkOptions } from "../runtime/exports.js"
import {
    findPackageRoot,
    readPackageJson,
    walkPaths
} from "../runtime/exports.js"

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
    include: (path) => tsFileMatcher.test(path)
}

export const cwd = process.cwd()
export const packageRoot = findPackageRoot(cwd)
export const packageJson = readPackageJson(packageRoot)
export const packageName = packageJson.name
export const tsConfig = relative(cwd, join(packageRoot, "tsconfig.json"))
export const srcRoot = relative(cwd, join(packageRoot, "src"))
export const outRoot = relative(cwd, join(packageRoot, "dist"))
export const typesOut = join(outRoot, "types")
export const mjsOut = join(outRoot, "mjs")
export const cjsOut = join(outRoot, "cjs")
export const srcFiles = walkPaths(srcRoot, inFileFilter)
