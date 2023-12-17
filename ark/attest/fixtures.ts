import { readPackageJson, writeJson } from "@arktype/fs"
import { rmSync } from "node:fs"
import { join } from "node:path"
import { writeSnapshotUpdatesOnExit } from "./cache/snapshots.js"
import { analyzeProjectAssertions } from "./cache/writeAssertionCache.js"
import { ensureCacheDirs, getConfig, type AttestConfig } from "./config.js"
import { forTypeScriptVersions } from "./tsVersioning.js"

export const setup = (options: Partial<AttestConfig> = {}) => {
	const config = getConfig()
	Object.assign(config, options)
	rmSync(config.cacheDir, { recursive: true, force: true })
	ensureCacheDirs()
	if (config.skipTypes) {
		return
	}
	forTypeScriptVersions(
		(version) =>
			writeAssertionData(join(config.assertionCacheDir, `${version}.json`)),
		{
			versions: config.tsVersions
		}
	)
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
