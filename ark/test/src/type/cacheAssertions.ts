import { rmSync } from "node:fs"
import type { ProjectOptions } from "ts-morph"
import { Project } from "ts-morph"
import type { AttestOptions } from "../config.js"
import { getConfig } from "../config.js"
import { ensureDir, writeJson } from "../main.js"
import { writeCachedInlineSnapshotUpdates } from "../writeSnapshot.js"
import { getAssertionsByFile } from "./analysis.js"

export const forceCreateTsMorphProject = (opts?: ProjectOptions) => {
	const config = getConfig()
	const tsMorphOptions: ProjectOptions = {
		...opts,
		compilerOptions: {
			diagnostics: true
		}
	}
	if (config.tsconfig) {
		tsMorphOptions.tsConfigFilePath = config.tsconfig
	}
	const project = new Project(tsMorphOptions)
	return project
}

let __projectCache: undefined | Project
export const getTsMorphProject = () => {
	if (!__projectCache) {
		__projectCache = forceCreateTsMorphProject()
	}
	return __projectCache
}

export const setup = (options?: AttestOptions) => {
	const config = getConfig(options)
	if (config.skipTypes) {
		return
	}
	rmSync(config.cacheDir, { recursive: true, force: true })
	ensureDir(config.cacheDir)
	ensureDir(config.snapCacheDir)
	writeJson(
		config.assertionCacheFile,
		getAssertionsByFile({ isInitialCache: true })
	)
}

export const cleanup = () => {
	const config = getConfig()
	try {
		writeCachedInlineSnapshotUpdates()
	} finally {
		if (!config.preserveCache) {
			rmSync(config.cacheDir, { recursive: true, force: true })
		}
	}
}
