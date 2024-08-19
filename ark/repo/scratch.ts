const index = `export { cleanup, setup, teardown, writeAssertionData } from "./fixtures.ts";
// ensure fixtures are exported before config so additional settings can load
export { caller } from "@ark/fs";
export { attest } from "./assert/attest.ts";
export { bench } from "./bench/bench.ts";
export { getBenchAssertionsAtPosition, getTypeAssertionsAtPosition } from "./cache/getCachedAssertions.ts";
export { getDefaultAttestConfig } from "./config.ts";
export { findAttestTypeScriptVersions, getPrimaryTsVersionUnderTest } from "./tsVersioning.ts";
export { contextualize } from "./utils.ts";
`

const t = index.replaceAll(
	/(import|export\s+.*?from\s+["'])(.*?\.ts)(["'])/g,
	(match, p1, p2, p3) => `${p1}${p2.replace(".ts", ".js")}${p3}`
)

console.log(t)

const again = `import { shell, writeJson } from "@ark/fs";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { writeSnapshotUpdatesOnExit } from "./cache/snapshots.ts";
import { analyzeProjectAssertions } from "./cache/writeAssertionCache.ts";
import { ensureCacheDirs, getConfig } from "./config.ts";
import { forTypeScriptVersions } from "./tsVersioning.ts";
export const setup = (options) => {
    if (options) {
        const existing = process.env.ATTEST_CONFIG ? JSON.parse(process.env.ATTEST_CONFIG) : {};
        process.env.ATTEST_CONFIG = JSON.stringify(Object.assign(existing, options));
    }
    const config = getConfig();
    rmSync(config.cacheDir, { recursive: true, force: true });
    ensureCacheDirs();
    if (config.skipTypes)
        return teardown;
    if (config.tsVersions.length === 1 &&
        config.tsVersions[0].alias === "typescript")
        writeAssertionData(config.defaultAssertionCachePath);
    else {
        forTypeScriptVersions(config.tsVersions, version => shell("");
    }
    return teardown;
};
export const writeAssertionData = (toPath) => {
    console.log("⏳ Waiting for TypeScript to check your project (this may take a while)...");
    writeJson(toPath, analyzeProjectAssertions());
};
export const cleanup = () => writeSnapshotUpdatesOnExit();
/** alias for cleanup to align with vitest and others */
export const teardown = cleanup;
`

const t2 = again.replaceAll(
	/(import\s+.*?from\s+["'])(.*?\.ts)(["'])/g,
	(match, p1, p2, p3) => `${p1}${p2.replace(".ts", ".js")}${p3}`
)

console.log(t2)
