import { existsSync, mkdirSync, rmSync } from "node:fs"
import { join, resolve } from "node:path"
import { getCmdFromPid, readJson } from "@re-/node"
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
    cacheDir: string
    assertionCacheFile: string
    typeTraceCacheFile: string
    snapCacheDir: string
}

interface ReAssertJson {
    tsconfig?: string | undefined
    precached?: boolean
    preserveCache?: boolean
    assertAliases?: string[]
    stringifySnapshots?: boolean
    benchPercentThreshold?: number
}

interface ReJson {
    assert?: ReAssertJson
}

const argsIncludeUpdateFlag = (args: string[]) =>
    args.some((arg) => ["-u", "--update", "--updateSnapshot"].includes(arg))

export const getReAssertConfig = memoize((): ReAssertConfig => {
    const reJson: ReJson = existsSync("re.json") ? readJson("re.json") : {}
    const tsconfig = existsSync("tsconfig.json") ? resolve("tsconfig.json") : ""
    const reAssertJson: ReAssertJson = reJson.assert ?? {}
    // By default, do not update snapshots
    let updateSnapshots = false
    if (process.env.RE_ASSERT_CMD) {
        // If using @re-/assert runner, RE_ASSERT_CMD will be set to the original cmd.
        // Check whether it contains an update flag.
        updateSnapshots = argsIncludeUpdateFlag(
            process.env.RE_ASSERT_CMD.split(" ")
        )
    } else if (argsIncludeUpdateFlag(process.argv)) {
        // If the command for this process contains an update flag, update snapshots.
        updateSnapshots = true
    } else if (process.env.JEST_WORKER_ID) {
        // If we're in a jest worker process, check if the parent process cmd contains an update flag.
        const parentCmd = getCmdFromPid(process.ppid)
        if (parentCmd) {
            updateSnapshots = argsIncludeUpdateFlag(parentCmd.split(" "))
        }
    }
    const cacheDir = resolve(".reassert")
    const snapCacheDir = join(cacheDir, "snaps")
    rmSync(cacheDir, { recursive: true, force: true })
    mkdirSync(cacheDir)
    mkdirSync(snapCacheDir)
    return {
        updateSnapshots,
        tsconfig,
        precached: false,
        preserveCache: false,
        assertAliases: ["assert"],
        stringifySnapshots: false,
        cacheDir,
        snapCacheDir,
        assertionCacheFile: join(cacheDir, "assertions.json"),
        typeTraceCacheFile: join(cacheDir, "trace.json"),
        benchPercentThreshold: 10,
        ...reAssertJson
    }
})
