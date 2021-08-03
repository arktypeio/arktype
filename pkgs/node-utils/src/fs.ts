import {
    readdirSync,
    lstatSync,
    chmodSync,
    createWriteStream,
    existsSync,
    mkdirSync,
    statSync,
    readFileSync
} from "fs"
import { readFile } from "fs/promises"
import { fileURLToPath, URL } from "url"
import getCurrentLine from "get-current-line"
import { homedir } from "os"
import { join, dirname } from "path"
import { once } from "events"
import { promisify } from "util"
import { finished } from "stream"

const streamFinished = promisify(finished)

export const filePath = (fileUrl: string) => new URL(fileUrl).pathname
export const fromDirPath = (fileUrl: string, ...segments: string[]) =>
    join(dirPath(fileUrl), ...segments)

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

export const readJsonAsync = async (path: string) =>
    JSON.parse(await readFile(path, { encoding: "utf8" }))

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
export const dirPath = (path: string) => {
    let file
    if (path.includes("://")) {
        // is a url, e.g. file://, or https://
        const url = new URL(path)
        file = url.protocol === "file:" ? fileURLToPath(url) : url.href
    } else {
        // is already a typical path
        file = path
    }
    return dirname(file)
}

/** Fetch the file and directory paths from the caller. */
export const dirName = (...joinWith: string[]) =>
    join(
        dirPath(
            getCurrentLine({
                method: "dirName",
                frames: 0,
                immediate: false
            }).file
        ),
        ...joinWith
    )
