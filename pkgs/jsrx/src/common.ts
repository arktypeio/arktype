import { existsSync, readFileSync } from "fs"
import { join } from "path"

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

export const getPackageJsonContents = () => {
    const expectedPackageJsonPath = join(process.cwd(), "package.json")
    if (!existsSync(expectedPackageJsonPath)) {
        throw new Error(
            `File ${expectedPackageJsonPath} didn't exist. You must run jsrx from the root of your package. `
        )
    }
    return JSON.parse(readFileSync(expectedPackageJsonPath).toString())
}
