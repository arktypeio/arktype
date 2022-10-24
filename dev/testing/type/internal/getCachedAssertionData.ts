import { existsSync } from "node:fs"
import type { AtTestConfig } from "../../common.js"
import { readJson } from "#runtime"

export const getCachedAssertionData = (config: AtTestConfig) => {
    if (!existsSync(config.assertionCacheFile)) {
        throw new Error(
            `Unable to find precached assertion data at '${config.assertionCacheFile}'. ` +
                `Did you forget to call 'cacheTypeAssertions' before running your tests?`
        )
    }
    return readJson(config.assertionCacheFile)
}
