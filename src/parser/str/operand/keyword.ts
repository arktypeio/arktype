import type { Attributes } from "../../../attributes/attributes.js"
import type { Conform } from "../../../internal.js"

export type Keyword = keyof Keyword.Inferences

export namespace Keyword {
    const defineKeywordAttributes = <keywordsToAttributes>(
        keywordsToAttributes: Conform<
            keywordsToAttributes,
            Record<Keyword, Attributes>
        >
    ) => keywordsToAttributes

    export type Inferences = {
        // TS keywords
        any: any
        bigint: bigint
        boolean: boolean
        false: false
        never: null
        null: null
        number: number
        object: object
        string: string
        symbol: symbol
        true: true
        undefined: undefined
        unknown: unknown
        void: void
        // JS Object types
        Function: Function
        // Supplemental types
        array: unknown[]
        dictionary: Record<string, unknown>
        // Regex
        email: string
        alphanumeric: string
        alphaonly: string
        lowercase: string
        uppercase: string
        // Numeric
        integer: number
    }

    // TODO: is this a problem if branches mutate?
    export const attributeMap = defineKeywordAttributes({
        // TS keywords
        any: {},
        bigint: { type: "bigint" },
        boolean: { type: "boolean" },
        false: { type: "boolean", value: false },
        // TODO: Add never
        never: {},
        null: {
            type: "null",
            value: null
        },
        number: { type: "number" },
        object: { branches: [{ type: "object" }, { type: "array" }] },
        string: { type: "string" },
        symbol: { type: "symbol" },
        true: { type: "boolean", value: true },
        undefined: { type: "undefined", value: undefined },
        unknown: {},
        void: { type: "undefined", value: undefined },
        // JS Object types
        Function: { type: "function" },
        // Supplemental types
        array: { type: "array" },
        dictionary: { type: "object" },
        // Regex
        email: { regex: /^(.+)@(.+)\.(.+)$/, type: "string" },
        alphanumeric: { regex: /^[\dA-Za-z]+$/, type: "string" },
        alphaonly: { regex: /^[A-Za-z]+$/, type: "string" },
        lowercase: { regex: /^[a-z]*$/, type: "string" },
        uppercase: { regex: /^[A-Z]*$/, type: "string" },
        // Numeric
        integer: { divisor: 1, type: "number" }
    })
}
