import { TypeNode } from "../nodes/type.js"
import type { Infer } from "../parse/definition.js"
import { scope } from "../scope.js"

/**
 * @keywords keywords: {"any": "any",
        "bigint": "a bigint",
        "boolean": "a boolean",
        "false": "false",
        "never": "never",
        "null": "null",
        "number": "a number",
        "object": "an object",
        "string": "a string",
        "symbol": "a symbol",
        "true": "true",
        "unknown": "unknown",
        "void": "void",
        "undefined": "undefined"}
 * @docgenScope
 * @docgenTable
 */
export const tsKeywordsScope = scope(
    {
        any: "unknown" as Infer<any>,
        bigint: TypeNode.from({ domain: "bigint" }),
        boolean: TypeNode.from({ value: true }, { value: false }),
        false: TypeNode.from({ value: false }) as Infer<false>,
        never: TypeNode.from(),
        null: TypeNode.from({ value: null }),
        number: TypeNode.from({ domain: "number" }),
        object: TypeNode.from({ domain: "object" }),
        string: TypeNode.from({ domain: "string" }),
        symbol: TypeNode.from({ domain: "symbol" }),
        true: TypeNode.from({ value: true }) as Infer<true>,
        unknown:
            "bigint|boolean|null|number|object|string|symbol|undefined" as Infer<unknown>,
        void: TypeNode.from({ value: undefined }) as Infer<void>,
        undefined: TypeNode.from({ value: undefined })
    },
    { name: "ts", standard: false }
)

export const tsKeywords = tsKeywordsScope.compile()
