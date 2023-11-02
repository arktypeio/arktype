import { rmSync } from "node:fs"
import { ensureDir, writeJson } from "@arktype/fs"
import type { AttestOptions } from "../config.js"
import { getConfig } from "../config.js"
import { writeCachedInlineSnapshotUpdates } from "../snapshot/writeSnapshot.js"
import { getAssertionsByFile } from "./analysis.js"

export const setup = (options?: AttestOptions) => {
	const config = getConfig(options)
	if (config.skipTypes) {
		return
	}
	rmSync(config.cacheDir, { recursive: true, force: true })
	ensureDir(config.cacheDir)
	ensureDir(config.snapCacheDir)
	console.log(
		"Caching assertions - time may vary based on cwd and project size."
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
