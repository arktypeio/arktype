import { readJsonSync, writeJsonSync } from "fs-extra"
import { join } from "path"

type ScriptFunction = () => any
type ScriptsDefinition = Record<
    string,
    ScriptFunction | { run: ScriptFunction }
>
type JscriptsArgs = {
    scripts: ScriptsDefinition
}
type JscriptsConfig = JscriptsArgs | ScriptsDefinition
type InjectedScripts = Record<string, string>

const cleanupConfig = (config: JscriptsConfig): JscriptsArgs => {
    if (typeof config.scripts === "object") {
        return config as JscriptsArgs
    }
    return {
        scripts: config as ScriptsDefinition
    }
}

export const jscripts = (config: JscriptsConfig) => {
    const { scripts } = cleanupConfig(config)
}

const runScript = (name: string) => {}

const writeScriptsToPackageJson = (scripts: InjectedScripts) => {
    const packageJsonFile = join(__dirname, "package.json")
    const config = readJsonSync(packageJsonFile)
    writeJsonSync(
        packageJsonFile,
        {
            ...config,
            scripts: { ...config.scripts, ...scripts }
        },
        { spaces: 4 }
    )
}
