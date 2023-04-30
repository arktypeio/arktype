import { existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { ensureDir, fromCwd, walkPaths } from "./fs.js"
import { getParamValue, hasFlag } from "./shell.js"

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
    files: string[]
}

export type AttestOptions = Partial<AttestConfig>

const getDefaultConfig = (): AttestConfig => {
    const cacheDir = resolve(".attest")
    const snapCacheDir = join(cacheDir, "snaps")
    const assertionCacheFile = join(cacheDir, "assertions.json")
    return {
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
        filter: undefined,
        files: walkPaths(process.cwd(), {
            include: (path) => path.includes(".test."),
            ignoreDirsMatching: /node_modules|dist/
        })
    }
}

const addCliConfig = (config: AttestConfig) => {
    let k: keyof AttestConfig
    for (k in config) {
        if (config[k] === false) {
            config[k] = hasFlag(k) as never
        } else {
            const value = getParamValue(k)
            if (value !== undefined) {
                config[k] = value as never
            }
        }
    }
    return config
}

let cachedConfig: AttestConfig = process.env.ATTEST_CONFIG
    ? JSON.parse(process.env.ATTEST_CONFIG)
    : addCliConfig(getDefaultConfig())

export const configure = (options?: Partial<AttestConfig>): AttestConfig => {
    if (options) {
        cachedConfig = { ...cachedConfig, ...options }
    }
    ensureDir(cachedConfig.cacheDir)
    ensureDir(cachedConfig.snapCacheDir)
    process.env.ATTEST_CONFIG = JSON.stringify(cachedConfig)
    return cachedConfig
}

export const getConfig = (): AttestConfig => cachedConfig
