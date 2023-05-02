import { TypeNode } from "../nodes/type.js"
import type { Infer } from "../parse/definition.js"
import { scope } from "../scope.js"

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

export const tsKeywordsScope = scope(
    {
        any: "unknown" as Infer<any>,
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
        unknown: TypeNode.from({}),
        void: "undefined" as Infer<void>,
        undefined: TypeNode.from({ basis: ["===", undefined] })
    },
    { name: "ts", standard: false }
)

export const tsKeywords = tsKeywordsScope.compile()
