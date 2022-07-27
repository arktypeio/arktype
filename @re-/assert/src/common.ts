import { strict } from "node:assert"
import { existsSync } from "node:fs"
import { platform } from "node:os"
import { join, relative, resolve } from "node:path"
import { ensureDir, readJson, shell } from "@re-/node"
import { diff, DiffOptions, isRecursible, toString } from "@re-/tools"
// @ts-ignore
import ConvertSourceMap from "convert-source-map"
import { default as memoize } from "micro-memoize"
import { SourceMapConsumer } from "source-map-js"
import type { EqualsOptions } from "./value/context.js"

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
    matcher: RegExp | undefined
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
    stringifySnapshots?: boolean
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

export const literalSerialize = (value: any): any => {
    if (typeof value === "object") {
        return value === null
            ? null
            : Object.fromEntries(
                  Object.entries(value).map(([k, v]) => [
                      k,
                      literalSerialize(v)
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

export const assertDeepEquals = (
    expected: unknown,
    actual: unknown,
    options?: DiffOptions
) => {
    const changes = diff(expected, actual, options)
    if (changes) {
        throw new strict.AssertionError({
            message: `Values differed at the following paths:\n${toString(
                changes,
                { indent: 2 }
            )}`,
            expected,
            actual
        })
    }
}

export const assertEquals = (
    expected: unknown,
    actual: unknown,
    options?: EqualsOptions
) => {
    if (isRecursible(expected) && isRecursible(actual)) {
        assertDeepEquals(expected, actual, {
            ...options,
            baseKey: "expected",
            compareKey: "actual"
        })
    } else {
        strict.equal(actual, expected)
    }
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
    // This matcher can be used to filter processes we have control over like benches
    const possibleMatcher = checkArgsForParam(argsToCheck, "only")
    if (possibleMatcher) {
        console.log(
            `Running benches matching expression '${possibleMatcher}'...`
        )
        return new RegExp(possibleMatcher)
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
        matcher: getMatcher(argsToCheck),
        tsconfig,
        precached: argsToCheck.includes("--precached"),
        preserveCache: false,
        assertAliases: ["assert"],
        stringifySnapshots: false,
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

export const isVitest = () => "__vitest_worker__" in globalThis

/**
 * Currently, Vitest uses some interal code similar to this to rewrite stack traces,
 * but only if an error bubbles to the test level. We just create a stack trace to get the
 * caller position, so the stack is never rewritten based on sourcemaps and breaks
 * reassert's type assertion locations.
 *
 * To work around this, we use a couple utilities and the data from the Vitest worker global
 * to map the position ourselves.
 */
export const fixVitestPos = (transformedPos: SourcePosition) => {
    const transformedFileContents = (
        globalThis as any
    ).__vitest_worker__.moduleCache.get(transformedPos.file).code
    const jsonSourceMap = ConvertSourceMap.fromSource(transformedFileContents)
        .setProperty("sources", [transformedPos.file])
        .toJSON()
    const mapper = new SourceMapConsumer(jsonSourceMap)
    const originalPos = mapper.originalPositionFor({
        line: transformedPos.line,
        column: transformedPos.char
    })
    if (originalPos.line === null || originalPos.column === null) {
        throw new Error(
            `Unable to determine vitest sourcemap for ${toString(
                transformedPos
            )}.`
        )
    }
    return {
        ...transformedPos,
        line: originalPos.line,
        char: originalPos.column + 1
    }
}
