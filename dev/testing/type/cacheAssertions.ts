import { mkdirSync, rmSync } from "node:fs"
import { getAtTestConfig } from "../common.js"
import { writeCachedInlineSnapshotUpdates } from "../writeSnapshot.js"
import { getAssertionsByFile } from "./analysis.js"
import { writeJson } from "#runtime"

export type SetupCacheOptions = {
    forcePrecache?: boolean
}

export const cacheAssertions = ({ forcePrecache }: SetupCacheOptions = {}) => {
    const config = getAtTestConfig()
    if (!config.precached && !forcePrecache) {
        throw new Error(
            `You must set 'precached' to true in the 'assert' section ` +
                ` of your re.json config to enable precaching.`
        )
    }
    rmSync(config.cacheDir, { recursive: true, force: true })
    mkdirSync(config.cacheDir)
    mkdirSync(config.snapCacheDir)
    writeJson(
        config.assertionCacheFile,
        getAssertionsByFile({ isInitialCache: true })
    )
}

export const cleanupAssertions = () => {
    const config = getAtTestConfig()
    try {
        writeCachedInlineSnapshotUpdates()
    } finally {
        if (!config.preserveCache) {
            rmSync(config.cacheDir, { recursive: true, force: true })
        }
    }
}
