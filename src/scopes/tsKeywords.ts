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
        bigint: TypeNode.from({ base: "bigint" }),
        boolean: TypeNode.from({ base: [true] }, { base: [false] }),
        false: TypeNode.from({ base: [false] }) as Infer<false>,
        never: TypeNode.from(),
        null: TypeNode.from({ base: [null] }),
        number: TypeNode.from({ base: "number" }),
        object: TypeNode.from({ base: "object" }),
        string: TypeNode.from({ base: "string" }),
        symbol: TypeNode.from({ base: "symbol" }),
        true: TypeNode.from({ base: [true] }) as Infer<true>,
        unknown:
            "bigint|boolean|null|number|object|string|symbol|undefined" as Infer<unknown>,
        void: TypeNode.from({ base: [undefined] }) as Infer<void>,
        undefined: TypeNode.from({ base: [undefined] })
    },
    { name: "ts", standard: false }
)

export const tsKeywords = tsKeywordsScope.compile()
