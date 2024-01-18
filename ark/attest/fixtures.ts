import {  shell, writeJson } from "@arktype/fs"
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
	if (
		config.tsVersions.length === 1 &&
		config.tsVersions[0].alias === "typescript"
	) {
		writeAssertionData(join(config.assertionCacheDir, "typescript.json"))
	} else {
		forTypeScriptVersions(config.tsVersions, (version) =>
			shell(
				`npm exec -c "attestPrecache ${join(
					config.assertionCacheDir,
					version.alias + ".json"
				)}"`
			)
		)
	}
}

export const writeAssertionData = (toPath: string) => {
	"⏳ Waiting for TypeScript to check your project (this may take a while)..."
	console.log()
	writeJson(toPath, analyzeProjectAssertions())
}

export const cleanup = () => {
	writeSnapshotUpdatesOnExit()
}
