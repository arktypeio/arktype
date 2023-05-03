import { existsSync } from "node:fs"
import type { AttestConfig } from "../../config.js"
import { readJson } from "../../main.js"

export const getCachedAssertionData = (config: AttestConfig) => {
    if (!existsSync(config.assertionCacheFile)) {
        throw new Error(
            `Unable to find precached assertion data at '${config.assertionCacheFile}'. ` +
                `please use Attest CLI or call 'cacheTypeAssertions' before running your tests.`
        )
    }
    return readJson(config.assertionCacheFile)
}
