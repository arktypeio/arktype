import {
    readdirSync,
    lstatSync,
    chmodSync,
    createWriteStream,
    existsSync,
    mkdirSync,
    statSync
} from "fs"
import { homedir } from "os"
import { join, dirname } from "path"
import { once } from "events"
import { promisify } from "util"
import { finished } from "stream"
import filedirname from "filedirname"

const streamFinished = promisify(finished)

export const filePath = (fileUrl: string) => new URL(fileUrl).pathname
export const dirPath = (fileUrl: string) => dirname(filePath(fileUrl))
export const fromDirPath = (fileUrl: string, ...segments: string[]) =>
    join(dirPath(fileUrl), ...segments)

export const fileNameCompatible = (e: Error) => filedirname(e)[0]
export const dirNameCompatible = (e: Error) => filedirname(e)[1]

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

export type WalkOptions = {
    excludeFiles: boolean
    excludeDirs: boolean
}

export const walkPaths = (dir: string, options: WalkOptions): string[] =>
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
