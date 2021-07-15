import { readJsonSync, writeFileSync } from "fs-extra"
import { join } from "path"
import { prompt, shell } from "@re-do/node-utils"

export type GenerateJsrxOptions = {
    language: "js" | "ts"
}

const jsImportsTemplate = `const { jsrx, $, shell } = require("jsrx")`

const tsImportsTemplate = `import { jsrx, $, shell } from "jsrx"`

export const generateFileContents = (
    scripts: Record<string, string>,
    { language }: GenerateJsrxOptions
) => `${language === "js" ? jsImportsTemplate : tsImportsTemplate}

jsrx({
    dev: {
        ${Object.entries(scripts)
            .map(([name, command]) => {
                if (command.startsWith("jsrx")) {
                    throw new Error(
                        "Cannot generate a jsrx file from package.json scripts that already rely on jsrx. If you've deleted your jsrx file, you should manually put it back."
                    )
                }
                return `${
                    // Put script name in quotes if it's not alphanumeric
                    /[^a-zA-Z0-9]/.test(name) ? `"${name}"` : name
                    // Put script value in backticks to try and avoid conflicts
                }: $(\`${command}\`)`
            })
            .join(",\n        ")}
    },
    prod: {},
    shared: {}
})
`

export const generateJsrx = (options: GenerateJsrxOptions) => {
    const packageJsonFile = join(process.cwd(), "package.json")
    const packageJsonContents = readJsonSync(packageJsonFile)
    const scripts = packageJsonContents.scripts ?? {}
    const fileToGenerate = join(
        process.cwd(),
        `jsrx.${options.language === "js" ? "js" : "ts"}`
    )
    writeFileSync(fileToGenerate, generateFileContents(scripts, options))
    return fileToGenerate
}

export const promptForJsrxFile = async () => {
    const shouldGenerate = await prompt(
        `Found no 'jsrx.js' or 'jsrx.ts' file in ${process.cwd()}. Would you like to generate one from your package.json?`,
        "confirm"
    )
    if (shouldGenerate) {
        const language = await prompt(
            `Which language would you like to generate?`,
            "select",
            {
                choices: [
                    { title: "JavaScript (jsrx.js)", value: "js" },
                    { title: "TypeScript (jsrx.ts)", value: "ts" }
                ]
            }
        )
        const generatedFile = generateJsrx({ language })
        const shouldUpdatePackageJson = await prompt(
            "Would you like to automatically update your package.json scripts to use jsrx?",
            "confirm"
        )
        if (shouldUpdatePackageJson) {
            shell("jsrx jsrxGen")
        }
        return generatedFile
    } else {
        throw Error("A jsrx file is required.")
    }
}
