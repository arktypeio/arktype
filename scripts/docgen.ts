import { DocGenConfig } from "./docgen/config.js"
import { extractDocData } from "./docgen/extract.js"
import { writeDocData } from "./docgen/write.js"

export const config: DocGenConfig = {
    packages: [
        {
            name: "@re-/model",
            entryPoints: ["src/index.ts"]
        }
    ]
}
console.group(`reDoc: Generating docs for ${1} package(s)...✍️`)
const data = extractDocData(config)
writeDocData(data)
console.log(`reDoc: Enjoy your new docs! 📚`)
console.groupEnd()
