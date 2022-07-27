import { stdout } from "node:process"
import { DocGenConfig } from "./config.js"
import { extractRepo } from "./extract.js"
import { writeRepo } from "./write.js"
import { fromPackageRoot } from "@re-/node"

const fromRedoDevDocsDir = (...segments: string[]) =>
    fromPackageRoot("redo.dev", "docs", ...segments)

export const config: DocGenConfig = {
    packages: [
        {
            path: "@re-/type",
            api: {
                outDir: fromRedoDevDocsDir("type", "api")
            },
            snippets: {
                sources: [
                    {
                        path: "docs/snippets/"
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
