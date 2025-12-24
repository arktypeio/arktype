import { fileName, shell, writeJson } from "@ark/fs"
import { rmSync } from "node:fs"
import { join } from "node:path"
import { writeSnapshotUpdatesOnExit } from "./cache/snapshots.ts"
import { analyzeProjectAssertions } from "./cache/writeAssertionCache.ts"
import { ensureCacheDirs, getConfig, type AttestConfig } from "./config.ts"
import { forTypeScriptVersions } from "./tsVersioning.ts"

export const setup = (options?: Partial<AttestConfig>): typeof teardown => {
	const { ...config } = getConfig()
	if (options) Object.assign(config, options)
	process.env.ATTEST_CONFIG = JSON.stringify(config)
	rmSync(config.cacheDir, { recursive: true, force: true })
	ensureCacheDirs()
	if (config.skipTypes) return teardown

	if (
		config.tsVersions.length === 1 &&
		config.tsVersions[0].alias === "default"
	)
		writeAssertionData(config.defaultAssertionCachePath)
	else {
		forTypeScriptVersions(config.tsVersions, version => {
			const precachePath = join(
				config.assertionCacheDir,
				version.alias + ".json"
			)
			// if we're in our own repo, we need to pnpm to use the root script to execute ts directly
			if (fileName().endsWith("ts"))
				shell("pnpm", ["attest", "precache", precachePath])
			// otherwise, just use npm to run the CLI command from build output
			else shell("npm", ["exec", "-c", "attest", "precache", precachePath])
		})
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
