import { existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { ensureDir, fromCwd } from "./main.js"

export type AttestConfig = {
    tsconfig: string | undefined
    preserveCache: boolean
    updateSnapshots: boolean
    skipTypes: boolean
    benchPercentThreshold: number
    benchErrorOnThresholdExceeded: boolean
    cacheDir: string
    assertionCacheFile: string
    snapCacheDir: string
    filter: string | undefined
}

export const getParamValue = (param: string) => {
    const paramIndex = process.argv.findIndex((arg) => arg.includes(param))
    if (paramIndex === -1) {
        return undefined
    }
    return process.argv[paramIndex + 1]
}

export const hasFlag = (args: string[], flag: string) =>
    process.argv.some((arg) => arg.includes(flag))

let cachedConfig: undefined | AttestConfig
export const configure = (options: Partial<AttestConfig>): AttestConfig => {
    const cacheDir = resolve(".attest")
    const snapCacheDir = join(cacheDir, "snaps")
    const assertionCacheFile = join(cacheDir, "assertions.json")
    cachedConfig = {
        tsconfig: existsSync(fromCwd("tsconfig.json"))
            ? fromCwd("tsconfig.json")
            : undefined,
        preserveCache: false,
        updateSnapshots: false,
        skipTypes: false,
        benchPercentThreshold: 20,
        benchErrorOnThresholdExceeded: false,
        cacheDir,
        snapCacheDir,
        assertionCacheFile,
        filter: getParamValue("filter"),
        ...options
    }
    ensureDir(cachedConfig.cacheDir)
    ensureDir(cachedConfig.snapCacheDir)
    return cachedConfig
}

export const getConfig = (): AttestConfig => {
    if (cachedConfig) {
        return cachedConfig
    }
    return configure({})
}
