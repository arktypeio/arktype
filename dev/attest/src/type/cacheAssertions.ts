import { mkdirSync, rmSync } from "node:fs"
import { getAttestConfig } from "../config.js"
import { writeJson } from "../runtime/main.js"
import { writeCachedInlineSnapshotUpdates } from "../writeSnapshot.js"
import { getAssertionsByFile } from "./analysis.js"

export type SetupCacheOptions = {
    forcePrecache?: boolean
}

export const cacheAssertions = ({ forcePrecache }: SetupCacheOptions = {}) => {
    const config = getAttestConfig()
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
    const config = getAttestConfig()
    try {
        writeCachedInlineSnapshotUpdates()
    } finally {
        if (!config.preserveCache) {
            rmSync(config.cacheDir, { recursive: true, force: true })
        }
    }
}
