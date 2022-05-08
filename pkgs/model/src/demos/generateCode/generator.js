import { getMapData } from "./index.js"
import { replaceMarkupCode } from "./markup.js"

/**
 * Main runnable for the code {inserter/generator/@re_placer/thing}
 */
const generator = () => {
    const mappedTSData = getMapData()
    replaceMarkupCode(mappedTSData)
}
generator()
