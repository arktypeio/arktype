import type { Attributes } from "../../../attributes/shared.js"
import type { array, Conform, dictionary } from "../../../internal.js"

export type Keyword = keyof Keyword.Inferences

export namespace Keyword {
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
        array: array
        dictionary: dictionary
        // Regex
        email: string
        alphanumeric: string
        alphaonly: string
        lowercase: string
        uppercase: string
        // Numeric
        integer: number
    }

    export const matches = (token: string): token is Keyword =>
        token in attributes

    export const attributesOf = (keyword: Keyword): Attributes =>
        attributes[keyword]

    const defineKeywordAttributes = <keywordsToAttributes>(
        keywordsToAttributes: Conform<
            keywordsToAttributes,
            Record<Keyword, Attributes>
        >
    ) => keywordsToAttributes

    // TODO: Impact of freezing these?
    const attributes = defineKeywordAttributes({
        // TS keywords
        any: {},
        bigint: { type: "bigint" },
        boolean: { type: "boolean" },
        false: { value: false },
        // TODO: Add never
        never: { value: "never" },
        null: { value: null },
        number: { type: "number" },
        object: {
            branches: [
                "|",
                { type: "dictionary" },
                { type: "array" },
                { type: "function" }
            ]
        },
        string: { type: "string" },
        symbol: { type: "symbol" },
        true: { value: true },
        undefined: { value: undefined },
        unknown: {},
        void: { value: undefined },
        // JS Object types
        Function: { type: "function" },
        // Supplemental types
        array: { type: "array" },
        dictionary: { type: "dictionary" },
        // Regex
        email: { regex: "/^(.+)@(.+)\\.(.+)$/" },
        alphanumeric: { regex: "/^[dA-Za-z]+$/" },
        alphaonly: { regex: "/^[A-Za-z]+$/" },
        lowercase: { regex: "/^[a-z]*$/" },
        uppercase: { regex: "/^[A-Z]*$/" },
        // Numeric
        integer: { divisor: 1 }
    })
}
