import { fromHere } from "@re-/node"
import { DocGenConfig } from "./docgen/config.js"
import { extractRepoMetaData } from "./docgen/extract.js"
import { writeDocs } from "./docgen/write.js"

export const config: DocGenConfig = {
    packages: [
        {
            path: "@re-/model"
        }
    ],
    outDir: fromHere("doc")
}
console.group(
    `reDoc: Generating docs for ${config.packages.length} package(s)...✍️`
)
const data = extractRepoMetaData(config)
writeDocs(data, config.outDir)
console.log(`reDoc: Enjoy your new docs! 📚`)
console.groupEnd()
