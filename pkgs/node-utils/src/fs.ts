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
import { join } from "path"
import { EXECUTABLE_SUFFIX } from "./os"
import { once } from "events"
import { promisify } from "util"
import { finished } from "stream"
const streamFinished = promisify(finished)

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
        mkdirSync(path)
    }
}

export const fromHome = fromDir(HOME)

export const REDO_DIR = fromHome(".redo")

export const fromRedo = fromDir(REDO_DIR)

export const ensureRedoDir = () => {
    ensureDir(REDO_DIR)
    return REDO_DIR
}

export const REDO_EXECUTABLE = fromRedo(`redo${EXECUTABLE_SUFFIX}`)

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

export const walk = (dir: string): [string, any][] =>
    readdirSync(dir).map((item) => [
        item,
        lstatSync(join(dir, item)).isDirectory() ? walk(join(dir, item)) : null
    ])

export const walkPaths = (dir: string): string[] =>
    readdirSync(dir).reduce((paths, item) => {
        const path = join(dir, item)
        return [
            ...paths,
            ...(lstatSync(path).isDirectory() ? walkPaths(path) : [path])
        ]
    }, [] as string[])
