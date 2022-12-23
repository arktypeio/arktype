import { existsSync, statSync } from "node:fs"
import { join } from "node:path"
import { readFile } from "../runtime/fs.ts"
import { shell } from "../runtime/shell.ts"

const root = "."
const dev = "dev"
const arktypeIo = join(dev, "arktype.io")
const docsDir = join(arktypeIo, "docs")
const srcRoot = "src"
const outRoot = "dist"
const typesOut = join(outRoot, "types")
const mjsOut = join(outRoot, "mjs")
const cjsOut = join(outRoot, "cjs")
const denoOut = join(outRoot, "deno")

export const getSourceControlPaths = () =>
    shell("git ls-files", { stdio: "pipe" })
        .toString()
        .split("\n")
        .filter((path) => existsSync(path) && statSync(path).isFile())

export type SourceFileEntry = [path: string, contents: string]

export const getSourceFileEntries = (): SourceFileEntry[] =>
    getSourceControlPaths()
        .filter((path) => tsFileMatcher.test(path))
        .map((path) => [path, readFile(path)])

export const repoDirs = {
    root,
    dev,
    arktypeIo,
    docsDir,
    srcRoot,
    outRoot,
    typesOut,
    mjsOut,
    cjsOut,
    denoOut
}

export const tsFileMatcher = /^.*\.(c|m)?tsx?$/
