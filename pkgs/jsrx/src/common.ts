export type ScriptFunction = () => any
export type ScriptMap = Record<string, ScriptFunction>

export type JsrxScripts = {
    dev?: ScriptMap
    prod?: ScriptMap
    shared?: ScriptMap
}

export type JsrxOptions = {
    autoGenerate?: boolean
    excludeOthers?: boolean
    // Normally this is passed via the cli, but this will take precedence if passed
    scriptName?: string
    envFiles?: {
        dev?: string
        prod?: string
    }
}
