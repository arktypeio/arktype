import { existsSync } from "node:fs"
import type { AttestConfig } from "../../config.ts"
import { readJson } from "../../runtime/main.ts"

export const getCachedAssertionData = (config: AttestConfig) => {
    if (!existsSync(config.assertionCacheFile)) {
        throw new Error(
            `Unable to find precached assertion data at '${config.assertionCacheFile}'. ` +
                `Did you forget to call 'cacheTypeAssertions' before running your tests?`
        )
    }
    return readJson(config.assertionCacheFile)
}
