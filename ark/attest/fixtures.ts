import { writeJson } from "@ark/fs"
import { rmSync } from "node:fs"
import { writeSnapshotUpdatesOnExit } from "./cache/snapshots.ts"
import { analyzeProjectAssertions } from "./cache/writeAssertionCache.ts"
import { ensureCacheDirs, getConfig, type AttestConfig } from "./config.ts"

export const setup = (options?: Partial<AttestConfig>): typeof teardown => {
	const { ...config } = getConfig()
	if (options) Object.assign(config, options)
	process.env.ATTEST_CONFIG = JSON.stringify(config)
	rmSync(config.cacheDir, { recursive: true, force: true })
	ensureCacheDirs()
	if (config.skipTypes) return teardown

	writeAssertionData(config.assertionCachePath)
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
