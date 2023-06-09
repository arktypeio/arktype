import { TypeNode } from "../nodes/type.js"
import type { Inferred } from "../parse/definition.js"
import { Scope } from "../scope.js"

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

export const tsKeyword = Scope.root({
    any: "unknown" as Inferred<any>,
    bigint: TypeNode({ basis: "bigint" }),
    boolean: "true|false",
    false: TypeNode({ basis: ["===", false as const] }),
    never: TypeNode(),
    null: TypeNode({ basis: ["===", null] }),
    number: TypeNode({ basis: "number" }),
    object: TypeNode({ basis: "object" }),
    string: TypeNode({ basis: "string" }),
    symbol: TypeNode({ basis: "symbol" }),
    true: TypeNode({ basis: ["===", true as const] }),
    unknown: TypeNode({ basis: undefined }),
    void: "undefined" as Inferred<void>,
    undefined: TypeNode({ basis: ["===", undefined] })
})

export const tsKeywordTypes = tsKeyword.export()
