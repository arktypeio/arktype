import { node } from "../nodes/type.js"
import type { CastTo } from "../parser/definition.js"
import { Scope } from "../scope.js"
import type { RootScope } from "./ark.js"

// "bigint": "a bigint",
// "boolean": "a boolean",
// "false": "false",
// "never": "never",
// "null": "null",
// "number": "a number",
// "object": "an object",
// "string": "a string",
// "symbol": "a symbol",
// "true": "true",
// "unknown": "unknown",
// "void": "void",
// "undefined": "undefined"

export type InferredTsKeywords = {
    any: any
    bigint: bigint
    boolean: boolean
    false: false
    never: never
    null: null
    number: number
    object: object
    string: string
    symbol: symbol
    true: true
    unknown: unknown
    void: void
    undefined: undefined
}

export const tsKeywords: RootScope<InferredTsKeywords> = Scope.root({
    any: "unknown" as CastTo<any>,
    bigint: node({ basis: "bigint" }),
    boolean: "true|false",
    false: node({ basis: ["===", false as const] }),
    never: node(),
    null: node({ basis: ["===", null] }),
    number: node({ basis: "number" }),
    object: node({ basis: "object" }),
    string: node({ basis: "string" }),
    symbol: node({ basis: "symbol" }),
    true: node({ basis: ["===", true as const] }),
    unknown: node({}),
    void: "undefined" as CastTo<void>,
    undefined: node({ basis: ["===", undefined] })
})

export const tsKeywordTypes = tsKeywords.export()
