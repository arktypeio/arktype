import { mkdirSync, rmSync } from "node:fs"
import { Project } from "ts-morph"
import { getAttestConfig } from "../config.js"
import { writeJson } from "../main.js"
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
    const config = getAttestConfig()
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
