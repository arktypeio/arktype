import { node } from "../nodes/node.ts"
import type { Infer } from "../parse/definition.ts"
import { scope } from "./scope.ts"

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
 * @scope
 */
export const tsKeywordsScope = scope(
    {
        any: "unknown" as Infer<any>,
        bigint: node({ domain: "bigint" }),
        boolean: node({ value: true }, { value: false }),
        false: node({ value: false }),
        never: node(),
        null: node({ value: null }),
        number: node({ domain: "number" }),
        object: node({ domain: "object" }),
        string: node({ domain: "string" }),
        symbol: node({ domain: "symbol" }),
        true: node({ value: true }),
        unknown:
            "bigint|boolean|null|number|object|string|symbol|undefined" as Infer<unknown>,
        void: node({ value: undefined }) as Infer<void>,
        undefined: node({ value: undefined })
    },
    { name: "ts", standard: false }
)

export const tsKeywords = tsKeywordsScope.compile()
