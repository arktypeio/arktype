import { join } from "node:path"
import type { WalkOptions } from "../runtime/exports.js"
import { walkPaths } from "../runtime/exports.js"

const root = "."
const dev = "dev"
const arktypeIo = join(dev, "arktype.io")
const docsDir = join(arktypeIo, "docs")
const srcRoot = "src"
const outRoot = "dist"
const typesOut = join(outRoot, "types")
const mjsOut = join(outRoot, "mjs")
const cjsOut = join(outRoot, "cjs")

export const repoDirs = {
    root,
    dev,
    arktypeIo,
    docsDir,
    srcRoot,
    outRoot,
    typesOut,
    mjsOut,
    cjsOut
}

export const isProd = () => process.argv.includes("--prod") || !!process.env.CI

export const tsFileMatcher = /^.*\.(c|m)?tsx?$/

export const inFileFilter: WalkOptions = {
    include: (path) => tsFileMatcher.test(path)
}

export const srcFiles = walkPaths(srcRoot, inFileFilter)
