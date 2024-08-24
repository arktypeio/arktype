import { shell, writeJson } from "@ark/fs"
import { rmSync } from "node:fs"
import { join } from "node:path"
import { writeSnapshotUpdatesOnExit } from "./cache/snapshots.ts"
import { analyzeProjectAssertions } from "./cache/writeAssertionCache.ts"
import { ensureCacheDirs, getConfig, type AttestConfig } from "./config.ts"
import { forTypeScriptVersions } from "./tsVersioning.ts"

export const setup = (options?: Partial<AttestConfig>): typeof teardown => {
	if (options) {
		const existing =
			process.env.ATTEST_CONFIG ? JSON.parse(process.env.ATTEST_CONFIG) : {}
		process.env.ATTEST_CONFIG = JSON.stringify(Object.assign(existing, options))
	}
	const config = getConfig()
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
