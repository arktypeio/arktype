import { readJson } from "@re-/node"
import { resolve } from "path"

export type LinePosition = {
    line: number
    char: number
}

export type SourcePosition = LinePosition & {
    file: string
    method: string
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

export type Memoized<F extends (...args: any[]) => any> = F & {
    cache?: ReturnType<F>
}

export const getReAssertConfig: Memoized<() => ReAssertConfig> = () => {
    if (!getReAssertConfig.cache) {
        const reJson: ReJson = readJson("re.json") ?? {}
        const reAssertJson: ReAssertJson = reJson.assert ?? {}
        getReAssertConfig.cache = {
            updateSnapshots: !!process.argv.find(
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
