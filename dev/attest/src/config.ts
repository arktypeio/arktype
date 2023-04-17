import { existsSync } from "node:fs"
import { join, resolve } from "node:path"
import * as process from "node:process"
import { ensureDir, fromCwd, getSourceFileEntries } from "./runtime/main.js"
import { getCmdFromPid } from "./utils.js"
import type { BenchFormat } from "./writeSnapshot.js"

export type AttestConfig = {
    precached: boolean
    preserveCache: boolean
    tsconfig: string | undefined
    updateSnapshots: boolean
    benchFormat: Required<BenchFormat>
    cacheDir: string
    assertionCacheFile: string
    snapCacheDir: string
    skipTypes: boolean
    typeSources: [path: string, contents: string][]
    benchPercentThreshold: number
    benchErrorOnThresholdExceeded: boolean
    filter: string | string[] | undefined
}

export const checkArgsForParam = (args: string[], param: `-${string}`) => {
    const filterFlagIndex = args.indexOf(param)
    if (filterFlagIndex === -1) {
        return undefined
    }
    return args[filterFlagIndex + 1]
}

const getArgsToCheck = () => {
    if (process.env.ARKTYPE_CHECK_CMD) {
        // If using arktype runner, ARKTYPE_CHECK_CMD will be set to the original cmd.
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

const getFilter = (argsToCheck: string[]) => {
    console.log("a")
    const filter =
        checkArgsForParam(argsToCheck, "--filter") ||
        checkArgsForParam(argsToCheck, "-f")
    if (filter) {
        if (filter.startsWith("/")) {
            return filter.split("/").slice(1)
        } else {
            return filter
        }
    }
}

let cachedConfig: AttestConfig | undefined

export const getAttestConfig = (): AttestConfig => {
    if (cachedConfig) {
        return cachedConfig
    }
    const possibleTsconfigPath = fromCwd("tsconfig.json")
    const tsconfig = existsSync(possibleTsconfigPath)
        ? possibleTsconfigPath
        : undefined
    const argsToCheck = getArgsToCheck()
    const cacheDir =
        checkArgsForParam(argsToCheck, "--cacheDir") ?? resolve(".attest")
    const snapCacheDir = join(cacheDir, "snaps")
    ensureDir(cacheDir)
    ensureDir(snapCacheDir)
    const noWrite = argsToCheck.some(
        (arg) => arg === "-n" || arg === "--no-write"
    )
    //TODO remove dev/arktype.io
    const typeSources = getSourceFileEntries().filter(
        ([path]) => !path.startsWith("dev/arktype.io")
    )
    cachedConfig = {
        updateSnapshots: argsToCheck.some(
            (arg) => arg === "-u" || arg === "--update"
        ),
        skipTypes: argsToCheck.some(
            (arg) => arg === "-s" || arg === "--skipTypes"
        ),
        typeSources,
        benchFormat: {
            noInline: argsToCheck.includes("--no-inline") || noWrite,
            noExternal: argsToCheck.includes("--no-external") || noWrite,
            path:
                checkArgsForParam(argsToCheck, "--benchmarksPath") ||
                join(process.cwd(), "benchmarks.json")
        },
        tsconfig,
        precached: argsToCheck.includes("--precache"),
        preserveCache: true,
        cacheDir,
        snapCacheDir,
        assertionCacheFile: join(cacheDir, "assertions.json"),
        benchPercentThreshold: 20,
        benchErrorOnThresholdExceeded: false,
        filter: getFilter(argsToCheck)
    }
    return cachedConfig
}
