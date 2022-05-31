import { getMapData } from "./mapTSfiles.js"
import { replaceMarkupCode } from "./markup.js"

const mappedTSData = getMapData()
await replaceMarkupCode(mappedTSData)
