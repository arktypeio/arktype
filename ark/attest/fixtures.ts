import { writeJson } from "@arktype/fs"
import { rmSync } from "node:fs"
import { writeSnapshotUpdatesOnExit } from "./cache/snapshots.js"
import { analyzeProjectAssertions } from "./cache/writeAssertionCache.js"
import { ensureCacheDirs, getConfig, type AttestConfig } from "./config.js"

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
	writeJson(config.assertionCacheFile, analyzeProjectAssertions())
}

export const cleanup = () => {
	writeSnapshotUpdatesOnExit()
}
