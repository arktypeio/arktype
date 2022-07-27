import { existsSync } from "node:fs"
import { readJson } from "@re-/node"
import { ReAssertConfig } from "../../common.js"

export const getCachedAssertionData = (config: ReAssertConfig) => {
    if (!existsSync(config.assertionCacheFile)) {
        throw new Error(
            `Unable to find precached assertion data at '${config.assertionCacheFile}'. ` +
                `Did you forget to call 'cacheTypeAssertions' before running your tests?`
        )
    }
    return readJson(config.assertionCacheFile)
}
