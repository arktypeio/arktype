import { writeJsonSync, readFileSync } from "fs-extra"
import { join } from "path"
import { ScriptMap } from "./common.js"

export const updatePackageJson = (
    scripts: ScriptMap,
    excludeOthers: boolean
) => {
    const jsrxScripts = Object.fromEntries(
        Object.keys(scripts).map((name) => [name, `jsrx ${name}`])
    )
    const packageJsonFile = join(process.cwd(), "package.json")
    const packageJsonContents = readFileSync(packageJsonFile).toString()
    const packageJsonLines = packageJsonContents.split("\n")
    const useFourSpaces =
        packageJsonLines.length > 2 && packageJsonLines[1].startsWith("    ")
    const packageJsonConfig = JSON.parse(packageJsonContents)
    writeJsonSync(
        packageJsonFile,
        {
            ...packageJsonConfig,
            scripts: {
                ...(!excludeOthers && packageJsonConfig.scripts),
                ...jsrxScripts,
                jsrxGen: "jsrx jsrxGen"
            }
        },
        { spaces: useFourSpaces ? 4 : 2 }
    )
}
