import { writeFileSync } from "fs"
import { join } from "path"
import { prompt, shell } from "@re-do/node"
import { getPackageJsonContents } from "./common.js"

export type GenerateJsrxOptions = {
    language: "js" | "ts"
}

const jsImportsTemplate = `const { scripts, $, shell } = require("@re-do/scripts")`

const tsImportsTemplate = `import { scripts, $, shell } from "@re-do/scripts"`

export const generateFileContents = (
    scripts: Record<string, string>,
    { language }: GenerateJsrxOptions
) => `${language === "js" ? jsImportsTemplate : tsImportsTemplate}

scripts({
    dev: {
        ${Object.entries(scripts)
            .map(([name, command]) => {
                if (command.startsWith("run ")) {
                    throw new Error(
                        "Cannot generate a scripts file from package.json scripts that already rely on @re-do/scripts. If you've deleted your scripts file, you should manually put it back."
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

export const generateScripts = (options: GenerateJsrxOptions) => {
    const packageJsonContents = getPackageJsonContents()
    const scripts = packageJsonContents.scripts ?? {}
    const fileToGenerate = join(
        process.cwd(),
        `scripts.${options.language === "js" ? "js" : "ts"}`
    )
    writeFileSync(fileToGenerate, generateFileContents(scripts, options))
    return fileToGenerate
}

export const promptForScriptsFile = async () => {
    const shouldGenerate = await prompt(
        `Found no 'scripts.js' or 'scripts.ts' file in ${process.cwd()}. Would you like to generate one from your package.json?`,
        "confirm"
    )
    if (shouldGenerate) {
        const language = await prompt(
            `Which language would you like to generate?`,
            "select",
            {
                choices: [
                    { title: "JavaScript (scripts.js)", value: "js" },
                    { title: "TypeScript (scripts.ts)", value: "ts" }
                ]
            }
        )
        const generatedFile = generateScripts({ language })
        const shouldUpdatePackageJson = await prompt(
            "Would you like to automatically update your package.json scripts to use @re-do/scripts?",
            "confirm"
        )
        if (shouldUpdatePackageJson) {
            shell("run updateScripts")
        }
        return generatedFile
    } else {
        throw Error("A scripts file is required.")
    }
}
