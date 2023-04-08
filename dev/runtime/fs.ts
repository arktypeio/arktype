import {
    existsSync,
    lstatSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    statSync,
    writeFileSync
} from "node:fs"
import { homedir } from "node:os"
import { dirname, join, parse } from "node:path"
import * as process from "node:process"
import { fileURLToPath, URL } from "node:url"
import { repoDirs } from "../scripts/common.js"
import { caller } from "./caller.js"
import { shell } from "./shell.js"

export const ensureDir = (path: string) => {
    if (existsSync(path)) {
        if (!statSync(path).isDirectory()) {
            throw new Error(`${path} exists and is not a directory.`)
        }
    } else {
        mkdirSync(path, { recursive: true })
    }
    return path
}

export const readFile = (path: string) => readFileSync(path).toString()

export const writeFile = (path: string, contents: string) =>
    writeFileSync(path, contents)

export const readJson = (path: string) =>
    JSON.parse(readFileSync(path, { encoding: "utf8" }))

export const writeJson = (path: string, data: object) =>
    writeFileSync(path, JSON.stringify(data, null, 4) + "\n")

export type JsonTransformer = (data: object) => object

export const rewriteJson = (path: string, transform: JsonTransformer) =>
    writeJson(path, transform(readJson(path)))

export type WalkOptions = {
    ignoreDirsMatching?: RegExp
    excludeFiles?: boolean
    excludeDirs?: boolean
    exclude?: (path: string) => boolean
    include?: (path: string) => boolean
}

export const walkPaths = (dir: string, options: WalkOptions = {}): string[] =>
    readdirSync(dir).reduce((paths: string[], item: string) => {
        const path = join(dir, item)
        const isDir = lstatSync(path).isDirectory()
        if (isDir && options.ignoreDirsMatching?.test(path)) {
            return paths
        }
        const excludeCurrent =
            (options.excludeDirs && isDir) ||
            (options.excludeFiles && !isDir) ||
            options.exclude?.(path) ||
            (options.include && !options.include(path))
        const nestedPaths = isDir ? walkPaths(path, options) : []
        return [...paths, ...(excludeCurrent ? [] : [path]), ...nestedPaths]
    }, [])

/** Fetch the file and directory paths from a path, uri, or `import.meta.url` */
export const filePath = (path: string) => {
    let file
    if (path.includes("://")) {
        // is a url, e.g. file://, or https://
        const url = new URL(path)
        file = url.protocol === "file:" ? fileURLToPath(url) : url.href
    } else {
        // is already a typical path
        file = path
    }
    return file
}

const fileOfCaller = () =>
    filePath(caller({ methodName: "fileOfCaller", upStackBy: 1 }).file)

const dirOfCaller = () =>
    dirname(filePath(caller({ methodName: "dirOfCaller", upStackBy: 1 }).file))

export const fileName = () => fileOfCaller()

export const dirName = () => dirOfCaller()

export const fromHere = (...joinWith: string[]) =>
    join(dirOfCaller(), ...joinWith)

export const fromCwd = (...joinWith: string[]) =>
    join(process.cwd(), ...joinWith)

export const fromHome = (...joinWith: string[]) => join(homedir()!, ...joinWith)

export const fsRoot = parse(process.cwd()).root

export const findPackageRoot = (fromDir?: string) => {
    const startDir = fromDir ?? dirOfCaller()
    let dirToCheck = startDir
    while (dirToCheck !== fsRoot) {
        try {
            const contents = readJson(join(dirToCheck, "package.json"))
            /*
             * If the file is just a stub with no package name, don't consider
             * it a package root
             */
            if (contents.name) {
                return dirToCheck
            }
        } catch {
            // If the file doesn't exist, go up another level
        }
        dirToCheck = join(dirToCheck, "..")
    }
    throw new Error(`${startDir} is not part of a node package.`)
}

export const fromPackageRoot = (...joinWith: string[]) =>
    join(findPackageRoot(dirOfCaller()), ...joinWith)

export const readPackageJson = (startDir?: string) =>
    readJson(join(findPackageRoot(startDir), "package.json"))

export const getSourceControlPaths = () =>
    // include tracked and untracked files as long as they are not ignored
    shell("git ls-files --exclude-standard --cached --others", {
        stdio: "pipe"
    })!
        .toString()
        .split("\n")
        .filter((path) => existsSync(path) && statSync(path).isFile())

export const tsFileMatcher = /^.*\.(c|m)?tsx?$/

const inFileFilter: WalkOptions = {
    include: (path) => tsFileMatcher.test(path),
    ignoreDirsMatching: /node_modules|dist|docgen/
}

export const getSourceFilePaths = (dir = repoDirs.root) =>
    walkPaths(dir, inFileFilter)

export const getSourceFileEntries = (
    dir = repoDirs.root
): [path: string, contents: string][] =>
    getSourceFilePaths(dir).map((path) => [path, readFile(path)])
