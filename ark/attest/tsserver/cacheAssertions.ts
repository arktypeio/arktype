import { writeJson } from "@arktype/fs"
import { rmSync } from "node:fs"
import { ensureCacheDirs, getConfig, type AttestConfig } from "../config.ts"
import { writeCachedInlineSnapshotUpdates } from "../snapshot/writeSnapshot.ts"
import { getAssertionsByFile } from "./analysis.ts"

export const setup = (options: Partial<AttestConfig> = {}) => {
	const config = getConfig()
	Object.assign(config, options)
	rmSync(config.cacheDir, { recursive: true, force: true })
	ensureCacheDirs()
	if (config.skipTypes) {
		return
	}
	console.log(
		"⏳ Waiting for TypeScript to check your project (this may take a while)..."
	)
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
