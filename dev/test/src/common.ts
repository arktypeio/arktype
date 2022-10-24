import { existsSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { ensureDir, readJson } from "@arktype/runtime"
import { getCmdFromPid } from "./utils.js"
import type { BenchFormat } from "./writeSnapshot.js"

export type LinePosition = {
    line: number
    char: number
}

export type LinePositionRange = {
    start: LinePosition
    end: LinePosition
}

export type SourcePosition = LinePosition & {
    file: string
    method: string
}

export const positionToString = (position: SourcePosition) =>
    `line ${position.line}, character ${position.char} at path '${position.file}'`

export type AtTestConfig = Required<AtTestJson> & {
    updateSnapshots: boolean
    benchFormat: Required<BenchFormat>
    cacheDir: string
    assertionCacheFile: string
    snapCacheDir: string
    skipTypes: boolean
    transient: boolean
    filter: string[] | string | undefined
}

type AtTestJson = {
    tsconfig?: string | undefined
    precached?: boolean
    preserveCache?: boolean
    assertAliases?: string[]
    benchPercentThreshold?: number
    benchErrorOnThresholdExceeded?: boolean
}

type ReJson = {
    assert?: AtTestJson
}

const checkArgsForParam = (args: string[], param: `-${string}`) => {
    const filterFlagIndex = args.indexOf(param)
    if (filterFlagIndex === -1) {
        return undefined
    }
    return args[filterFlagIndex + 1]
}

export const getFileKey = (path: string) => relative(".", path)

export const isRecursible = (value: unknown): value is object =>
    typeof value === "object" && value !== null

export type Serialized<T> = T extends undefined | symbol | bigint | Function
    ? string
    : T extends number | string | boolean
    ? T
    : { [K in keyof T]: Serialized<T[K]> }

export const literalSerialize = <T>(value: T): Serialized<T> =>
    serialize(value, false, [])

export const stringSerialize = (value: unknown) => serialize(value, true, [])

const serialize = <T>(
    value: T,
    alwaysStringify: boolean,
    seen: unknown[]
): any => {
    if (isRecursible(value)) {
        if (seen.includes(value)) {
            return "<cyclic>"
        } else {
            seen.push(value)
            const serializedObject = Array.isArray(value)
                ? value.map((_) => serialize(_, alwaysStringify, seen))
                : Object.fromEntries(
                      Object.entries(value).map(([k, v]) => [
                          k,
                          serialize(v, alwaysStringify, seen)
                      ])
                  )
            return alwaysStringify
                ? JSON.stringify(serializedObject)
                : serializedObject
        }
    } else {
        return serializePrimitive(value, alwaysStringify)
    }
}

const serializePrimitive = (value: unknown, stringify?: boolean) => {
    switch (typeof value) {
        case "symbol":
            return `<symbol ${value.description ?? "(anonymous)"}>`
        case "function":
            return `<function ${value.name ?? "(anonymous)"}>`
        case "undefined":
            return "<undefined>"
        case "bigint":
            return `<bigint ${value}>`
        default:
            return stringify ? JSON.stringify(value) : value
    }
}

const getArgsToCheck = () => {
    if (process.env.ARKTYPE_CHECK_CMD) {
        // If using @arktype/test runner, ARKTYPE_CHECK_CMD will be set to the original cmd.
        return process.env.ARKTYPE_CHECK_CMD.split(" ")
    } else if (process.env.JEST_WORKER_ID) {
        // If we're in a jest worker process, check the parent process cmd args
        const parentCmd = getCmdFromPid(process.ppid)
        if (!parentCmd) {
            throw new Error(
                `Unable to locate parent thread of jest worker ${process.env.JEST_WORKER_ID}.`
            )
        }
        return parentCmd.split(" ")
    }
    // By default, just use the args from the current process
    return process.argv
}

/** Determine which benches to run:
 *    If a "--filter" (or "-f") arg is present...
 *       1. If the arg starts with "/", run benches at that "/"-delimited path
 *       2. Otherwise, run benches including a segment anywhere in their path with the arg's value
 *    Otherwise, return undefined, and all benches will be run
 */
const getFilter = (argsToCheck: string[]) => {
    const filter =
        checkArgsForParam(argsToCheck, "--filter") ||
        checkArgsForParam(argsToCheck, "-f")
    if (filter) {
        if (filter.startsWith("/")) {
            console.log(`Running benches at path '${filter}'...`)
            return filter.split("/").slice(1)
        } else {
            console.log(
                `Running benches including a segment named '${filter}'...`
            )
            return filter
        }
    }
}

let cachedConfig: AtTestConfig | undefined

// eslint-disable-next-line max-lines-per-function
export const getAtTestConfig = (): AtTestConfig => {
    if (cachedConfig) {
        return cachedConfig
    }
    const reJson: ReJson = existsSync("re.json") ? readJson("re.json") : {}
    const tsconfig = existsSync("tsconfig.json") ? resolve("tsconfig.json") : ""
    const atTestJson: AtTestJson = reJson.assert ?? {}
    const argsToCheck = getArgsToCheck()
    const cacheDir =
        checkArgsForParam(argsToCheck, "--cacheDir") ?? resolve(".attest")
    const snapCacheDir = join(cacheDir, "snaps")
    ensureDir(cacheDir)
    ensureDir(snapCacheDir)
    const transient = argsToCheck.some(
        (arg) => arg === "-t" || arg === "--transient"
    )
    const noWrite = argsToCheck.some(
        (arg) => arg === "-n" || arg === "--no-write"
    )
    return {
        updateSnapshots:
            transient ||
            argsToCheck.some((arg) => arg === "-u" || arg === "--update"),
        skipTypes: argsToCheck.some(
            (arg) => arg === "-s" || arg === "--skipTypes"
        ),
        benchFormat: {
            noInline:
                argsToCheck.includes("--no-inline") || noWrite || transient,
            noExternal: argsToCheck.includes("--no-external") || noWrite,
            path:
                checkArgsForParam(argsToCheck, "--benchmarksPath") ||
                join(process.cwd(), "benchmarks.json")
        },
        filter: getFilter(argsToCheck),
        tsconfig,
        precached: argsToCheck.includes("--precache"),
        preserveCache: false,
        assertAliases: ["assert"],
        cacheDir,
        snapCacheDir,
        assertionCacheFile: join(cacheDir, "assertions.json"),
        benchPercentThreshold: 20,
        benchErrorOnThresholdExceeded: false,
        transient,
        ...atTestJson
    }
}
