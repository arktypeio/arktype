import { fromHere } from "@re-/node"
import { DocGenConfig } from "./docgen/config.js"
import { extractRepo, writeRepo } from "./docgen/index.js"

export const config: DocGenConfig = {
    packages: [
        {
            path: "@re-/model",
            snippets: {
                sources: ["snippets/**"],
                targets: ["README.md"]
            }
        }
    ],
    outDir: fromHere("doc")
}
console.group(
    `reDoc: Generating docs for ${config.packages.length} package(s)...✍️`
)
writeRepo({ config, packages: extractRepo(config) })
console.log(`reDoc: Enjoy your new docs! 📚`)
console.groupEnd()
