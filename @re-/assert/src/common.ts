import { existsSync } from "node:fs"
import { platform } from "node:os"
import { join, relative, resolve } from "node:path"
import { ensureDir, readJson, shell } from "@re-/node"
import { default as memoize } from "micro-memoize"
import { BenchFormat } from "./writeSnapshot.js"

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

export interface ReAssertConfig extends Required<ReAssertJson> {
    updateSnapshots: boolean
    benchFormat: BenchFormat
    benchMatcher: RegExp | string | undefined
    cacheDir: string
    assertionCacheFile: string
    snapCacheDir: string
    skipTypes: boolean
}

interface ReAssertJson {
    tsconfig?: string | undefined
    precached?: boolean
    preserveCache?: boolean
    assertAliases?: string[]
    benchPercentThreshold?: number
    benchErrorOnThresholdExceeded?: boolean
}

interface ReJson {
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

export const literalSerialize = (value: any, seen: unknown[] = []): any => {
    if (typeof value === "object") {
        return value === null
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
    }
    if (typeof value === "symbol") {
        return `<symbol ${value.description ?? "(anonymous)"}>`
    }
    if (typeof value === "function") {
        return `<function ${value.name ?? "(anonymous)"}>`
    }
    return value
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

export const getReAssertConfig = memoize((): ReAssertConfig => {
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
})

export const getFileKey = (path: string) => relative(".", path)

export const getCmdFromPid = (pid: number) =>
    platform() === "win32" ? getCmdFromWindowsPid(pid) : getCmdFromPosixPid(pid)

const getCmdFromWindowsPid = (pid: number) => {
    const output = shell(
        `wmic.exe path Win32_Process where handle='${pid}' get commandline`,
        { stdio: "pipe" }
    ).toString()
    if (output.includes("No Instance(s) Available.")) {
        return undefined
    }
    return output
}

const getCmdFromPosixPid = (pid: number) => {
    const output = shell(`xargs -0 < /proc/${pid}/cmdline`, {
        stdio: "pipe"
    }).toString()
    if (output.includes("No such file or directory")) {
        return undefined
    }
    return output
}
