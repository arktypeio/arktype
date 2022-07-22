import { stdout } from "node:process"
import { fromPackageRoot } from "@re-/node"
import { DocGenConfig } from "./config.js"
import { extractRepo } from "./extract.js"
import { createWriteFilesConsumer } from "./snippets/writeFilesConsumer.js"
import { writeRepo } from "./write.js"

const fromRedoDevDir = (...segments: string[]) =>
    fromPackageRoot("redo.dev", ...segments)

export const config: DocGenConfig = {
    packages: [
        {
            path: "@re-/model",
            api: {
                outDir: fromRedoDevDir("docs", "model", "api")
            },
            snippets: {
                sources: [
                    {
                        path: "docs/snippets/"
                    }
                ],
                targets: ["README.md"],
                consumers: [
                    createWriteFilesConsumer({
                        rootOutDir: fromRedoDevDir("static", "stackblitz")
                    })
                ]
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
