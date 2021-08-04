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
import { readFile, writeFile } from "fs/promises"
import { fileURLToPath, URL } from "url"
import getCurrentLine from "get-current-line"
import { homedir } from "os"
import { join, dirname, parse } from "path"
import { once } from "events"
import { promisify } from "util"
import { finished } from "stream"

const streamFinished = promisify(finished)

export const isEsm = () => {
    try {
        return !__dirname
    } catch {
        return true
    }
}

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
    return path
}

export const readJson = (path: string) =>
    JSON.parse(readFileSync(path, { encoding: "utf8" }))

export const writeJson = (path: string, data: object) =>
    writeFileSync(path, JSON.stringify(data, null, 4))

export const readJsonAsync = async (path: string) =>
    JSON.parse(await readFile(path, { encoding: "utf8" }))

export const writeJsonAsync = async (path: string, data: object) =>
    writeFile(path, JSON.stringify(data, null, 4))

export type WalkOptions = {
    excludeFiles?: boolean
    excludeDirs?: boolean
}

export const walkPaths = (dir: string, options: WalkOptions = {}): string[] =>
    readdirSync(dir).reduce((paths, item) => {
        const path = join(dir, item)
        return [
            ...paths,
            ...(lstatSync(path).isDirectory()
                ? walkPaths(path, options).concat(
                      options.excludeDirs ? [] : path
                  )
                : options.excludeFiles
                ? []
                : [path])
        ]
    }, [] as string[])

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

const getCallerFile = (methodName: string) =>
    filePath(
        getCurrentLine({
            method: methodName,
            frames: 0,
            immediate: false
        }).file
    )

export const fileName = () => getCallerFile("fileName")

export const dirName = () => dirname(getCallerFile("dirName"))

export const fromHere = (...joinWith: string[]) =>
    join(dirname(getCallerFile("fromHere")), ...joinWith)

export const fsRoot = parse(process.cwd()).root

export const fromPackageRoot = (...joinWith: string[]) => {
    const callerDir = dirname(getCallerFile("fromPackageRoot"))
    let dirToCheck = callerDir
    while (dirToCheck !== fsRoot) {
        try {
            const contents = readJson(join(dirToCheck, "package.json"))
            // If the file is just a stub with no package name, don't consider
            // it a package root
            if (contents.name) {
                return join(dirToCheck, ...joinWith)
            }
        } catch {}
        dirToCheck = join(dirToCheck, "..")
    }
    throw new Error(`${callerDir} is not part of a node package.`)
}
