import dotEnv from "dotenv"
import { JsrxScripts, JsrxOptions, ScriptFunction } from "./common.js"
import { updatePackageJson } from "./updatePackageJson.js"

export { shell, $ } from "@re-do/node-utils"

const addDefaultConfig = (config: JsrxScripts): Required<JsrxScripts> => ({
    dev: {},
    prod: {},
    shared: {},
    ...config
})

const addDefaultOptions = (options: JsrxOptions) => ({
    autoGenerate: true,
    excludeOthers: false,
    ...options
})

export const jsrx = (config: JsrxScripts, options: JsrxOptions = {}) => {
    const configWithDefaults = addDefaultConfig(config)
    const { dev, prod, shared } = configWithDefaults
    const { scriptName, autoGenerate, excludeOthers, envFiles } =
        addDefaultOptions(options)
    const nameArg = process.argv.length > 2 ? process.argv[2] : null
    const name = scriptName ?? nameArg
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

    if (autoGenerate || name === "jsrxGen") {
        updatePackageJson(allScripts, excludeOthers)
        if (name === "jsrxGen") {
            return
        }
    }
    validateScriptName(name, configWithDefaults)
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
