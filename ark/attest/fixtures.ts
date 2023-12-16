import { writeJson } from "@arktype/fs"
import { rmSync } from "node:fs"
import { writeSnapshotUpdatesOnExit } from "./cache/snapshots.js"
import { analyzeProjectAssertions } from "./cache/writeAssertionCache.js"
import { ensureCacheDirs, getConfig, type AttestConfig } from "./config.js"
import { forEachTypeScriptVersion } from "./tsVersioning.js"

export const setup = (options: Partial<AttestConfig> = {}) => {
	const config = getConfig()
	Object.assign(config, options)
	rmSync(config.cacheDir, { recursive: true, force: true })
	ensureCacheDirs()
	if (config.skipTypes) {
		return
	}
	if (config.tsVersions) {
		forEachTypeScriptVersion((alias) => writeAssertionData(""), {
			aliases: config.tsVersions
		})
	} else {
		writeAssertionData("")
	}
}

const writeAssertionData = (toPath: string) => {
	console.log(
		"⏳ Waiting for TypeScript to check your project (this may take a while)..."
	)
	writeJson(toPath, analyzeProjectAssertions())
}

export const cleanup = () => {
	writeSnapshotUpdatesOnExit()
}
