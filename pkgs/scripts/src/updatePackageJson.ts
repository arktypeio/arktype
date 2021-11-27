import { writeFileSync, readFileSync } from "fs"
import { join } from "path"
import { ScriptMap } from "./common.js"

export const updatePackageJson = (
    scripts: ScriptMap,
    excludeOthers: boolean
) => {
    const packageJsonScripts = Object.fromEntries(
        Object.keys(scripts).map((name) => [name, `run ${name}`])
    )
    const packageJsonFile = join(process.cwd(), "package.json")
    const packageJsonContents = readFileSync(packageJsonFile).toString()
    const packageJsonLines = packageJsonContents.split("\n")
    const useFourSpaces =
        packageJsonLines.length > 2 && packageJsonLines[1].startsWith("    ")
    const packageJsonConfig = JSON.parse(packageJsonContents)
    writeFileSync(
        packageJsonFile,
        JSON.stringify(
            {
                ...packageJsonConfig,
                scripts: {
                    ...(!excludeOthers && packageJsonConfig.scripts),
                    ...packageJsonScripts,
                    updateScripts: "run updateScripts"
                }
            },
            null,
            useFourSpaces ? 4 : 2
        )
    )
}
