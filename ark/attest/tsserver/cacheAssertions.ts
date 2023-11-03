import { rmSync } from "node:fs"
import { writeJson } from "@arktype/fs"
import { ensureCacheDirs, getConfig } from "../config.js"
import { writeCachedInlineSnapshotUpdates } from "../snapshot/writeSnapshot.js"
import { getAssertionsByFile } from "./analysis.js"

export const setup = () => {
	const config = getConfig()
	rmSync(config.cacheDir, { recursive: true, force: true })
	ensureCacheDirs()
	if (config.skipTypes) {
		return
	}
	console.log(
		"Caching assertions - time may vary based on cwd and project size..."
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
