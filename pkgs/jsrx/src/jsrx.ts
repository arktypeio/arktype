import { readJsonSync, writeJsonSync } from "fs-extra"
import { commandSync, SyncOptions } from "execa"
import { join } from "path"

// TODO: SIMPLIFY (JUST FUNCTIONS)

type ScriptFunction = () => any
type ScriptDefinition<Names extends string> = string | ScriptFunction | Names[]
type ScriptOptions<Names extends string> = {
    run: ScriptDefinition<Names>
    options?: SyncOptions
}
type ScriptValue<Names extends string> =
    | ScriptDefinition<Names>
    | ScriptOptions<Names>
type ScriptMap<Names extends string> = { [Name in Names]: ScriptValue<Names> }

type JsrxConfig<
    DevScripts extends ScriptMap<string>,
    ProdScripts extends ScriptMap<string>,
    SharedScripts extends ScriptMap<string>
> = {
    dev?: DevScripts
    prod?: ProdScripts
    shared?: SharedScripts
    options?: {
        // Normally this is passed via the cli, but this will take precedence if passed
        scriptName?: keyof DevScripts | keyof ProdScripts | keyof SharedScripts
        autoGenerate?: boolean
    }
}

const addDefaults = <
    DevScripts extends ScriptMap<string>,
    ProdScripts extends ScriptMap<string>,
    SharedScripts extends ScriptMap<string>
>(
    config: JsrxConfig<DevScripts, ProdScripts, SharedScripts>
): Required<JsrxConfig<DevScripts, ProdScripts, SharedScripts>> => ({
    dev: {} as DevScripts,
    prod: {} as ProdScripts,
    shared: {} as SharedScripts,
    options: {},
    ...config
})

export const jsrx = <
    DevScripts extends ScriptMap<string>,
    ProdScripts extends ScriptMap<string>,
    SharedScripts extends ScriptMap<string>
>(
    config: JsrxConfig<DevScripts, ProdScripts, SharedScripts>
) => {
    const configWithDefaults = addDefaults(config)
    const { dev, prod, shared, options } = configWithDefaults
    const { scriptName, autoGenerate } = options
    const nameArg = process.argv.length > 2 ? process.argv[2] : null
    const name = (scriptName as string | undefined) ?? nameArg
    if (!name) {
        throw new Error(
            "'jsrx' requires a positional argument representing the name of the script to run, e.g. 'jsrx build'."
        )
    }
    let scriptValue: ScriptValue<string>
    const devScripts = { ...dev, ...shared }
    const prodScripts = {
        ...prod,
        ...Object.fromEntries(
            Object.entries(shared).map(([scriptName, scriptDef]) => [
                `${scriptName}-prod`,
                scriptDef
            ])
        )
    }
    const allScripts = { ...devScripts, ...prodScripts }
    if (name === "gen") {
        updatePackageJson(allScripts)
        return
    } else {
        validateScriptName(name, configWithDefaults)
    }
    if (name in devScripts) {
        process.env.NODE_ENV = "development"
        scriptValue = devScripts[name]
    } else if (name in prodScripts) {
        process.env.NODE_ENV = "production"
        scriptValue = prodScripts[name]
    } else if (name === "gen") {
        scriptValue = "gen"
    } else {
        throw new Error(`Unexpected error evluating script '${name}'.`)
    }
    let runScript: ScriptFunction
    const scriptDefinition =
        typeof scriptValue === "object" && !Array.isArray(scriptValue)
            ? scriptValue.run
            : scriptValue
    if (typeof scriptDefinition === "function") {
        runScript = scriptDefinition
    } else if (typeof scriptDefinition === "string") {
        runScript = () => commandSync(scriptDefinition)
    } else if (Array.isArray(scriptDefinition)) {
        runScript = () =>
            scriptDefinition.forEach(name =>
                commandSync(
                    `npm run ${
                        process.env.NODE_ENV === "development"
                            ? name
                            : formatProdName(name, shared)
                    }`
                )
            )
    } else {
        throw new Error(
            `Found an unexpected config value for script '${name}': ${JSON.stringify(
                scriptDefinition,
                null,
                4
            )}`
        )
    }
    if (autoGenerate) {
        updatePackageJson({ ...devScripts, ...prodScripts })
    }
    runScript()
}

const validateScriptName = <
    DevScripts extends ScriptMap<string>,
    ProdScripts extends ScriptMap<string>,
    SharedScripts extends ScriptMap<string>
>(
    name: string,
    {
        dev,
        prod,
        shared
    }: Required<JsrxConfig<DevScripts, ProdScripts, SharedScripts>>
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
    if (appearances === 0) {
        throw new Error(
            `Couldn't find a script named '${name}' in your jsrx config. Try running 'jsrx gen' to regenerate your scripts.`
        )
    } else if (appearances > 1) {
        throw new Error(
            `Script named '${name}' exists in both more than one of 'dev', 'prod', and 'shared' blocks.`
        )
    }
}

const formatProdName = (name: string, shared: ScriptMap<string>) =>
    name in shared ? `${name}-prod` : name

const updatePackageJson = (scripts: ScriptMap<string>) => {
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
                ...packageJsonContents.scripts,
                ...jsrxScripts,
                jsrxGen: "jsrx gen"
            }
        },
        { spaces: 4 }
    )
}
