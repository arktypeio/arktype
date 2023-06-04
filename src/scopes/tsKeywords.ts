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
    bigint: TypeNode.from({ basis: "bigint" }),
    boolean: "true|false",
    false: TypeNode.from({ basis: ["===", false as const] }),
    never: TypeNode.from(),
    null: TypeNode.from({ basis: ["===", null] }),
    number: TypeNode.from({ basis: "number" }),
    object: TypeNode.from({ basis: "object" }),
    string: TypeNode.from({ basis: "string" }),
    symbol: TypeNode.from({ basis: "symbol" }),
    true: TypeNode.from({ basis: ["===", true as const] }),
    unknown: TypeNode.from({ basis: undefined }),
    void: "undefined" as Inferred<void>,
    undefined: TypeNode.from({ basis: ["===", undefined] })
})

export const tsKeywordTypes = tsKeyword.compile()
