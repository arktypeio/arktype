import { readJsonSync, writeJsonSync } from "fs-extra"
import { join } from "path"
import dotEnv from "dotenv"

type ScriptFunction = () => any
type ScriptMap = Record<string, ScriptFunction>

type JsrxScripts = {
    dev?: ScriptMap
    prod?: ScriptMap
    shared?: ScriptMap
}

type JsrxOptions = {
    // Normally this is passed via the cli, but this will take precedence if passed
    scriptName?: string
    autoGenerate?: boolean
    excludeOthers?: boolean
    envFiles?: {
        dev?: string
        prod?: string
    }
}

const addDefaults = (config: JsrxScripts): Required<JsrxScripts> => ({
    dev: {},
    prod: {},
    shared: {},
    ...config
})

export const jsrx = (config: JsrxScripts, options: JsrxOptions = {}) => {
    const configWithDefaults = addDefaults(config)
    const { dev, prod, shared } = configWithDefaults
    const { scriptName, autoGenerate, excludeOthers, envFiles } = options
    const nameArg = process.argv.length > 2 ? process.argv[2] : null
    const name = (scriptName as string | undefined) ?? nameArg
    if (!name) {
        throw new Error(
            "'jsrx' requires a positional argument representing the name of the script to run, e.g. 'jsrx build'."
        )
    }
    let runScript: ScriptFunction
    const devScripts = { ...dev, ...shared }
    const prodScripts = {
        ...prod,
        ...Object.fromEntries(
            Object.entries(shared).map(([scriptName, scriptDef]) => [
                `${scriptName}Prod`,
                scriptDef
            ])
        )
    }
    const allScripts = { ...devScripts, ...prodScripts }
    if (name === "jsrxGen") {
        updatePackageJson(allScripts, excludeOthers)
        return
    } else {
        validateScriptName(name, configWithDefaults)
    }
    if (name in devScripts) {
        process.env.NODE_ENV = "development"
        if (envFiles?.dev) {
            dotEnv.config({ path: envFiles.dev })
        }
        runScript = devScripts[name]
    } else if (name in prodScripts) {
        process.env.NODE_ENV = "production"
        if (envFiles?.prod) {
            dotEnv.config({ path: envFiles.prod })
        }
        runScript = prodScripts[name]
    } else {
        throw new Error(
            `Couldn't find a script named '${name}' in your jsrx config. Try running 'npx jsrx jsrxGen' to regenerate your scripts.`
        )
    }
    if (autoGenerate) {
        updatePackageJson({ ...devScripts, ...prodScripts }, excludeOthers)
    }
    runScript()
}

const validateScriptName = (
    name: string,
    { dev, prod, shared }: Required<JsrxScripts>
) => {
    let appearances = 0
    if (name in dev) {
        appearances++
    }
    if (name in prod) {
        appearances++
    }
    if (name in shared) {
        appearances++
    }
    if (appearances > 1) {
        throw new Error(
            `Script named '${name}' exists in more than one of 'dev', 'prod', and 'shared' blocks.`
        )
    }
}

const updatePackageJson = (
    scripts: ScriptMap,
    excludeOthers: boolean | undefined
) => {
    const jsrxScripts = Object.fromEntries(
        Object.keys(scripts).map(name => [name, `jsrx ${name}`])
    )
    const packageJsonFile = join(process.cwd(), "package.json")
    const packageJsonContents = readJsonSync(packageJsonFile)
    writeJsonSync(
        packageJsonFile,
        {
            ...packageJsonContents,
            scripts: {
                ...(!excludeOthers && packageJsonContents.scripts),
                ...jsrxScripts,
                jsrxGen: "jsrx jsrxGen"
            }
        },
        { spaces: 4 }
    )
}
