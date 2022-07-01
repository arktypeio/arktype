import { existsSync } from "node:fs"
import { platform } from "node:os"
import { join, relative, resolve } from "node:path"
import { ensureDir, readJson, shell } from "@re-/node"
import { transform } from "@re-/tools"
import { default as memoize } from "micro-memoize"

export type LinePosition = {
    line: number
    char: number
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

const argsIncludeSkipTypesFlag = (args: string[]) =>
    args.includes("--skipTypes")

const checkArgsForMatcher = (args: string[]) => {
    const filterFlagIndex = args.indexOf("--only")
    if (filterFlagIndex === -1) {
        return undefined
    }
    return args.at(filterFlagIndex + 1)
}

export const literalSerialize = (value: any): any => {
    if (typeof value === "object") {
        return value === null
            ? null
            : transform(value, ([k, v]) => [k, literalSerialize(v)])
    }
    if (typeof value === "symbol") {
        return `<symbol ${value.description ?? "(anonymous)"}>`
    }
    if (typeof value === "function") {
        return `<function ${value.name ?? "(anonymous)"}>`
    }
    return value
}

export const getReAssertConfig = memoize((): ReAssertConfig => {
    const reJson: ReJson = existsSync("re.json") ? readJson("re.json") : {}
    const tsconfig = existsSync("tsconfig.json") ? resolve("tsconfig.json") : ""
    const reAssertJson: ReAssertJson = reJson.assert ?? {}
    let argsToCheck: string[] | undefined
    let precached = false
    if (process.env.RE_ASSERT_CMD) {
        // If using @re-/assert runner, RE_ASSERT_CMD will be set to the original cmd.
        argsToCheck = process.env.RE_ASSERT_CMD.split(" ")
        // Precached should default to true if we are running from the @re-/assert runner
        precached = true
    } else if (process.env.JEST_WORKER_ID) {
        // If we're in a jest worker process, check the parent process cmd args
        const parentCmd = getCmdFromPid(process.ppid)
        if (parentCmd) {
            argsToCheck = parentCmd.split(" ")
        }
    }
    if (!argsToCheck) {
        // By default, just use the args from the current process
        argsToCheck = process.argv
    }
    // This matcher can be used to filter processes we have control over like benches
    const possibleMatcher = checkArgsForMatcher(argsToCheck)
    let matcher: RegExp | undefined
    if (possibleMatcher) {
        console.log(
            `Running benches matching expression '${possibleMatcher}'...`
        )
        matcher = new RegExp(possibleMatcher)
    }
    const cacheDir = resolve(".reassert")
    const snapCacheDir = join(cacheDir, "snaps")
    ensureDir(cacheDir)
    ensureDir(snapCacheDir)
    return {
        updateSnapshots: argsIncludeUpdateFlag(argsToCheck),
        skipTypes: argsIncludeSkipTypesFlag(argsToCheck),
        matcher,
        tsconfig,
        precached,
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
