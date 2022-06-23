import { stdout } from "node:process"
import { fromPackageRoot } from "@re-/node"
import { DocGenConfig } from "./config.js"
import { extractRepo } from "./extract.js"
import { writeRepo } from "./write.js"

const fromRedoDevDocsDir = (...segments: string[]) =>
    fromPackageRoot("redo.dev", "docs", ...segments)

export const config: DocGenConfig = {
    packages: [
        {
            path: "@re-/model",
            api: {
                outDir: fromRedoDevDocsDir("model", "api")
            },
            snippets: {
                sources: [
                    {
                        fileGlob: "snippets/**"
                    }
                ],
                targets: ["README.md"]
            }
        }
    ]
}

export const docgen = () => {
    console.group(`Generating docs for re-po...✍️`)
    stdout.write("Extracting re-po metadata...")
    const packages = extractRepo(config)
    stdout.write("✅\n")
    stdout.write("Updating re-po docs...")
    writeRepo({ config, packages })
    stdout.write("✅\n")
    console.log(`Enjoy your new docs! 📚`)
    console.groupEnd()
}
