import { rmSync } from "node:fs"
import { Project } from "ts-morph"
import { getConfig } from "../config.js"
import { ensureDir, writeJson } from "../main.js"
import { writeCachedInlineSnapshotUpdates } from "../writeSnapshot.js"
import { getAssertionsByFile } from "./analysis.js"

export const forceCreateTsMorphProject = () =>
    new Project({ compilerOptions: { diagnostics: true } })

let __projectCache: undefined | Project
export const getTsMorphProject = () => {
    if (!__projectCache) {
        __projectCache = forceCreateTsMorphProject()
    }
    return __projectCache
}

export const cacheAssertions = () => {
    const config = getConfig()
    rmSync(config.cacheDir, { recursive: true, force: true })
    ensureDir(config.cacheDir)
    ensureDir(config.snapCacheDir)
    writeJson(
        config.assertionCacheFile,
        getAssertionsByFile({ isInitialCache: true })
    )
}

export const cleanupAssertions = () => {
    const config = getConfig()
    try {
        writeCachedInlineSnapshotUpdates()
    } finally {
        if (!config.preserveCache) {
            rmSync(config.cacheDir, { recursive: true, force: true })
        }
    }
}
