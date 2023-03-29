import type { Infer } from "../parse/definition.ts"
import type { Domain } from "../utils/domains.ts"
import { scope } from "./scope.ts"

const always: Record<Domain, true> = {
    bigint: true,
    boolean: true,
    null: true,
    number: true,
    object: true,
    string: true,
    symbol: true,
    undefined: true
}

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
        any: ["node", always] as Infer<any>,
        bigint: ["node", { bigint: true }],
        boolean: ["node", { boolean: true }],
        false: ["node", { boolean: { value: false } }],
        never: ["node", {}],
        null: ["node", { null: true }],
        number: ["node", { number: true }],
        object: ["node", { object: true }],
        string: ["node", { string: true }],
        symbol: ["node", { symbol: true }],
        true: ["node", { boolean: { value: true } }],
        unknown: ["node", always] as Infer<unknown>,
        void: ["node", { undefined: true }] as Infer<void>,
        undefined: ["node", { undefined: true }]
    },
    { name: "ts", standard: false }
)

export const tsKeywords = tsKeywordsScope.compile()
