import {
    readdirSync,
    lstatSync,
    chmodSync,
    createWriteStream,
    existsSync,
    mkdirSync,
    statSync,
    readFileSync,
    writeFileSync
} from "fs"
import {
    readFile as readFileAsync,
    writeFile as writeFileAsync
} from "fs/promises"
import { fileURLToPath, URL } from "url"
import { homedir } from "os"
import { join, dirname, parse } from "path"
import { once } from "events"
import { finished } from "stream"
import { promisify } from "util"
import { caller, callsAgo } from "./caller.js"
import { FilterFunction } from "@re-do/utils"

export const streamFinished = promisify(finished)

export const HOME = homedir()

export const fromDir =
    (dir: string) =>
    (...pathSegments: string[]) =>
        join(dir, ...pathSegments)

export const ensureDir = (path: string) => {
    if (existsSync(path)) {
        if (!statSync(path).isDirectory()) {
            throw new Error(`${path} exists and is not a directory.`)
        }
    } else {
        mkdirSync(path, { recursive: true })
    }
}

export const fromHome = fromDir(HOME)

export const REDO_DIR = fromHome(".redo")

export const fromRedo = fromDir(REDO_DIR)

export const ensureRedoDir = () => {
    ensureDir(REDO_DIR)
    return REDO_DIR
}

export const makeExecutable = (path: string) => chmodSync(path, "755")

export const streamToFile = async (
    stream: NodeJS.ReadableStream,
    path: string
) => {
    const fileStream = createWriteStream(path)
    for await (const chunk of stream) {
        if (!fileStream.write(chunk)) {
            await once(fileStream, "drain")
        }
    }
    fileStream.end()
    await streamFinished(fileStream)
    await streamFinished(stream)
    return path
}

export const readFile = (path: string) => readFileSync(path).toString()

export const writeFile = (path: string, contents: string) =>
    writeFileSync(path, contents)

export const readJson = (path: string) =>
    JSON.parse(readFileSync(path, { encoding: "utf8" }))

export const writeJson = (path: string, data: object) =>
    writeFileSync(path, JSON.stringify(data, null, 4))

export const readJsonAsync = async (path: string) =>
    JSON.parse(await readFileAsync(path, { encoding: "utf8" }))

export const writeJsonAsync = async (path: string, data: object) =>
    writeFileAsync(path, JSON.stringify(data, null, 4))

export type WalkOptions = {
    excludeFiles?: boolean
    excludeDirs?: boolean
    exclude?: FilterFunction<string>
    include?: FilterFunction<string>
}

export const walkPaths = (dir: string, options: WalkOptions = {}): string[] =>
    readdirSync(dir).reduce((paths, item, index, siblings) => {
        const path = join(dir, item)
        const isDir = lstatSync(path).isDirectory()
        const excludeCurrent =
            (options.excludeDirs && isDir) ||
            (options.excludeFiles && !isDir) ||
            (options.exclude && options.exclude(path, index, siblings)) ||
            (options.include && !options.include(path, index, siblings))
        const nestedPaths = isDir ? walkPaths(path, options) : []
        return [...paths, ...(excludeCurrent ? [] : [path]), ...nestedPaths]
    }, [] as string[])

export const mapFilesToContents = (paths: string[]): Record<string, string> =>
    Object.fromEntries(
        paths.map((path) => [path, readFileSync(path).toString()])
    )

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

export const fsRoot = parse(process.cwd()).root

export const findPackageRoot = (fromDir?: string) => {
    const startDir = fromDir ?? dirOfCaller()
    let dirToCheck = startDir
    while (dirToCheck !== fsRoot) {
        try {
            const contents = readJson(join(dirToCheck, "package.json"))
            // If the file is just a stub with no package name, don't consider
            // it a package root
            if (contents.name) {
                return dirToCheck
            }
        } catch {}
        dirToCheck = join(dirToCheck, "..")
    }
    throw new Error(`${startDir} is not part of a node package.`)
}

export const fromPackageRoot = (...joinWith: string[]) =>
    join(findPackageRoot(dirOfCaller()), ...joinWith)
