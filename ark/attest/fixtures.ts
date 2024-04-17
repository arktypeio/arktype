import { shell, writeJson } from "@arktype/fs"
import { rmSync } from "node:fs"
import { join } from "node:path"
import { writeSnapshotUpdatesOnExit } from "./cache/snapshots.js"
import { analyzeProjectAssertions } from "./cache/writeAssertionCache.js"
import { ensureCacheDirs, getConfig, type AttestConfig } from "./config.js"
import { forTypeScriptVersions } from "./tsVersioning.js"

export const setup = (options: Partial<AttestConfig> = {}): void => {
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
		writeAssertionData(config.defaultAssertionCachePath)
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

export const writeAssertionData = (toPath: string): void => {
	console.log(
		"⏳ Waiting for TypeScript to check your project (this may take a while)..."
	)
	writeJson(toPath, analyzeProjectAssertions())
}

export const cleanup = (): void => writeSnapshotUpdatesOnExit()

/** alias for cleanup to align with vitest and others */
export const teardown = cleanup
