import { readJson, writeJson } from "@re-/node"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

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
    tsconfig?: string | undefined
    precached?: boolean
    precachePath?: string
    assertAlias?: string
}

export interface ReJson {
    assert?: ReAssertJson
}

export type Memoized<F extends (...args: any[]) => any> = F & {
    cache?: ReturnType<F>
}

export type JsonTransformer = (data: object) => object

export const rewriteJson = (path: string, transform: JsonTransformer) =>
    writeJson(path, transform(readJson(path)))

export const getReAssertConfig: Memoized<() => ReAssertConfig> = () => {
    if (!getReAssertConfig.cache) {
        const reJson: ReJson = existsSync("re.json") ? readJson("re.json") : {}
        const tsconfig = existsSync("tsconfig.json")
            ? resolve("tsconfig.json")
            : ""
        const reAssertJson: ReAssertJson = reJson.assert ?? {}
        getReAssertConfig.cache = {
            updateSnapshots: !!process.argv.find(
                (arg) => arg === "--update" || arg === "-u"
            ),
            tsconfig,
            precached: false,
            precachePath: resolve(".assert.cache.json"),
            assertAlias: "assert",
            ...reAssertJson
        }
    }
    return getReAssertConfig.cache
}
