import { Func } from "@re-/tools"
import { resolve } from "deno/std/path/mod.ts"

export type LinePosition = {
    line: number
    char: number
}

export type SourcePosition = LinePosition & {
    file: string
    method: string
}

export const writeJsonSync = (path: string, data: unknown) => {
    Deno.writeTextFileSync(path, JSON.stringify(data, null, 4))
}

export const readJsonSync = (path: string) => {
    try {
        return JSON.parse(Deno.readTextFileSync(path))
    } catch {
        return undefined
    }
}

export const setJsonKey = (path: string, key: string, value: unknown) =>
    writeJsonSync(path, { ...readJsonSync(path), [key]: value })

export const existsSync = (path: string) => {
    try {
        Deno.openSync(path).close()
        return true
    } catch {
        return false
    }
}

export interface ReAssertConfig extends Required<ReAssertJson> {
    updateSnapshots: boolean
}

export interface ReAssertJson {
    tsconfig?: string
    precached?: boolean
    precachePath?: string
}

export interface ReJson {
    assert?: ReAssertJson
}

export type Memoized<F extends Func> = F & { cache?: ReturnType<F> }

export const getReAssertConfig: Memoized<() => ReAssertConfig> = () => {
    if (!getReAssertConfig.cache) {
        const reJson: ReJson = readJsonSync("re.json") ?? {}
        const reAssertJson: ReAssertJson = reJson.assert ?? {}
        getReAssertConfig.cache = {
            updateSnapshots: !!Deno.args.find(
                (arg) => arg === "--update" || arg === "-u"
            ),
            tsconfig: resolve("tsconfig.json"),
            precached: false,
            precachePath: resolve(".assert.cache.json"),
            ...reAssertJson
        }
    }
    return getReAssertConfig.cache
}
