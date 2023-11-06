import { rmSync } from "node:fs"
import { writeJson } from "@arktype/fs"
import {
	type AttestConfig,
	configure,
	ensureCacheDirs,
	getConfig
} from "../config.js"
import { writeCachedInlineSnapshotUpdates } from "../snapshot/writeSnapshot.js"
import { getAssertionsByFile } from "./analysis.js"

export const setup = (options: Partial<AttestConfig> = {}) => {
	configure((baseConfig) => Object.assign(baseConfig, options))
	const config = getConfig()
	rmSync(config.cacheDir, { recursive: true, force: true })
	ensureCacheDirs()
	if (options.skipTypes) {
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
