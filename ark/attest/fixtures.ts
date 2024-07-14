import { shell, writeJson } from "@ark/fs"
import { rmSync } from "node:fs"
import { join } from "node:path"
import { writeSnapshotUpdatesOnExit } from "./cache/snapshots.js"
import { analyzeProjectAssertions } from "./cache/writeAssertionCache.js"
import { ensureCacheDirs, getConfig, type AttestConfig } from "./config.js"
import { forTypeScriptVersions } from "./tsVersioning.js"

export const setup = (options: Partial<AttestConfig> = {}): typeof teardown => {
	const config = getConfig()
	Object.assign(config, options)
	rmSync(config.cacheDir, { recursive: true, force: true })
	ensureCacheDirs()
	if (config.skipTypes) return teardown

	if (
		config.tsVersions.length === 1 &&
		config.tsVersions[0].alias === "typescript"
	)
		writeAssertionData(config.defaultAssertionCachePath)
	else {
		forTypeScriptVersions(config.tsVersions, version =>
			shell(
				`npm exec -c "attest precache ${join(
					config.assertionCacheDir,
					version.alias + ".json"
				)}"`
			)
		)
	}
	return teardown
}

export const writeAssertionData = (toPath: string): void => {
	console.log(
		"⏳ Waiting for TypeScript to check your project (this may take a while)..."
	)
	writeJson(toPath, analyzeProjectAssertions())
}

export const cleanup = (): void => writeSnapshotUpdatesOnExit()

/** alias for cleanup to align with vitest and others */
export const teardown: () => void = cleanup
