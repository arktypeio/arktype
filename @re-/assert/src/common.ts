import { existsSync } from "node:fs"
import { join, relative, resolve } from "node:path"
import { ensureDir, readJson } from "@re-/node"
import { getCmdFromPid } from "./util.js"
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

export type ReAssertConfig = Required<ReAssertJson> & {
    updateSnapshots: boolean
    benchFormat: BenchFormat
    benchMatcher: RegExp | string | undefined
    cacheDir: string
    assertionCacheFile: string
    snapCacheDir: string
    skipTypes: boolean
}

type ReAssertJson = {
    tsconfig?: string | undefined
    precached?: boolean
    preserveCache?: boolean
    assertAliases?: string[]
    benchPercentThreshold?: number
    benchErrorOnThresholdExceeded?: boolean
}

type ReJson = {
    assert?: ReAssertJson
}

const argsIncludeUpdateFlag = (args: string[]) =>
    args.some((arg) => ["-u", "--update", "--updateSnapshot"].includes(arg))

const checkArgsForParam = (args: string[], param: string) => {
    const filterFlagIndex = args.indexOf(`--${param}`)
    if (filterFlagIndex === -1) {
        return undefined
    }
    return args[filterFlagIndex + 1]
}

export const getFileKey = (path: string) => relative(".", path)

// TODO: Improve this type
export type Serialized<T> = T extends undefined | symbol | bigint | Function
    ? string
    : T extends number | string | boolean
    ? T
    : { [K in keyof T]: Serialized<T[K]> }

export const literalSerialize = <T>(
    value: T,
    seen: unknown[] = []
): Serialized<T> => {
    const result =
        typeof value === "object"
            ? value === null
                ? null
                : seen.includes(value)
                ? "<cyclic>"
                : Array.isArray(value)
                ? value.map((v) => literalSerialize(v, [...seen, value]))
                : Object.fromEntries(
                      Object.entries(value).map(([k, v]) => [
                          k,
                          literalSerialize(v, [...seen, value])
                      ])
                  )
            : typeof value === "symbol"
            ? `<symbol ${value.description ?? "(anonymous)"}>`
            : typeof value === "function"
            ? `<function ${value.name ?? "(anonymous)"}>`
            : typeof value === "undefined"
            ? "<undefined>"
            : typeof value === "bigint"
            ? `<bigint ${value}>`
            : value
    return result as Serialized<T>
}

const getArgsToCheck = () => {
    if (process.env.RE_ASSERT_CMD) {
        // If using @re-/assert runner, RE_ASSERT_CMD will be set to the original cmd.
        return process.env.RE_ASSERT_CMD.split(" ")
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

const getMatcher = (argsToCheck: string[]) => {
    // This matcher can be used to filter calls we have control over like benches
    const possibleMatcher = checkArgsForParam(argsToCheck, "only")
    if (possibleMatcher) {
        const asRegex = !!possibleMatcher.match(/\/.*\//)
        console.log(
            `Running benches ${
                asRegex ? "matching expression" : "including"
            } '${possibleMatcher}'...`
        )
        return asRegex
            ? new RegExp(possibleMatcher.slice(1, -1))
            : possibleMatcher
    }
}

let cachedConfig: ReAssertConfig | undefined

// eslint-disable-next-line max-lines-per-function
export const getReAssertConfig = (): ReAssertConfig => {
    if (cachedConfig) {
        return cachedConfig
    }
    const reJson: ReJson = existsSync("re.json") ? readJson("re.json") : {}
    const tsconfig = existsSync("tsconfig.json") ? resolve("tsconfig.json") : ""
    const reAssertJson: ReAssertJson = reJson.assert ?? {}
    const argsToCheck = getArgsToCheck()
    const cacheDir =
        checkArgsForParam(argsToCheck, "cacheDir") ?? resolve(".reassert")
    const snapCacheDir = join(cacheDir, "snaps")
    ensureDir(cacheDir)
    ensureDir(snapCacheDir)
    return {
        updateSnapshots: argsIncludeUpdateFlag(argsToCheck),
        skipTypes: argsToCheck.includes("--skipTypes"),
        benchFormat: {
            noInline: argsToCheck.includes("--no-inline"),
            noExternal: argsToCheck.includes("--no-external")
        },
        benchMatcher: getMatcher(argsToCheck),
        tsconfig,
        precached: argsToCheck.includes("--precache"),
        preserveCache: false,
        assertAliases: ["assert"],
        cacheDir,
        snapCacheDir,
        assertionCacheFile: join(cacheDir, "assertions.json"),
        benchPercentThreshold: 20,
        benchErrorOnThresholdExceeded: false,
        ...reAssertJson
    }
}
