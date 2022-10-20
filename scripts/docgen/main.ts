import { basename } from "node:path"
import { stdout } from "node:process"
import type { DocGenConfig } from "./config.js"
import { extractRepo } from "./extract.js"
import { createWriteFilesConsumer } from "./snippets/writeFilesConsumer.js"
import { writeRepo } from "./write.js"
import { fromPackageRoot } from "@arktype/node"

const fromRedoDevDir = (...segments: string[]) =>
    fromPackageRoot("arktype.io", ...segments)

const fromTypeDocsDir = (...segments: string[]) =>
    fromRedoDevDir("docs", ...segments)

const fromTypeDemosDir = (...segments: string[]) =>
    fromTypeDocsDir("demos", ...segments)

const fromTypePackageRoot = (...segments: string[]) =>
    fromPackageRoot("@arktype", "io", ...segments)

export const config: DocGenConfig = {
    packages: [
        {
            path: "@arktype/io",
            api: {
                outDir: fromTypeDocsDir("api")
            },
            snippets: {
                sources: [
                    {
                        path: "src/__snippets__"
                    }
                ],
                targets: [
                    fromTypePackageRoot("README.md"),
                    fromTypeDemosDir(
                        "stackblitzGenerators",
                        "createStackblitzDemo.ts"
                    )
                ],
                consumers: [
                    createWriteFilesConsumer({
                        rootOutDir: fromTypeDemosDir("static", "generated"),
                        transformRelativePath: (path) => basename(path),
                        transformJsImports: (snippet) =>
                            snippet.replaceAll(".js", ""),
                        transformContents: (content) =>
                            `export default \`${content.replaceAll(
                                "`",
                                "\\`"
                            )}\``
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
