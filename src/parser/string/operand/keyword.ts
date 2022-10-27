import { Attributes } from "../../../attributes/attributes.js"
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

    export const attributesOf = (keyword: Keyword) => attributes[keyword]

    const defineKeywordAttributes = <keywordsToAttributes>(
        keywordsToAttributes: Conform<
            keywordsToAttributes,
            Record<Keyword, Attributes>
        >
    ) => keywordsToAttributes

    // TODO: Impact of freezing these?
    const attributes = defineKeywordAttributes({
        // TS keywords
        any: Attributes.init("noop"),
        bigint: Attributes.init("type", "bigint"),
        boolean: Attributes.init("type", "boolean"),
        false: Attributes.init("value", false),
        // TODO: Add never
        never: Attributes.init("type", "never"),
        null: Attributes.init("value", null),
        number: Attributes.init("type", "number"),
        object:
            // Unfortunately, since the TS object keyword can be one of three
            // types within our dynamic type system, creating an accurate node
            // is cumbersome.
            Attributes.reduce(
                "union",
                Attributes.reduce(
                    "union",
                    Attributes.init("type", "dictionary"),
                    Attributes.init("type", "array")
                ),
                Attributes.init("type", "function")
            ),
        string: Attributes.init("type", "string"),
        symbol: Attributes.init("type", "symbol"),
        true: Attributes.init("value", true),
        undefined: Attributes.init("value", undefined),
        unknown: Attributes.init("noop"),
        void: Attributes.init("value", undefined),
        // JS Object types
        Function: Attributes.init("type", "function"),
        // Supplemental types
        array: Attributes.init("type", "array"),
        dictionary: Attributes.init("type", "dictionary"),
        // Regex
        email: Attributes.init("regex", /^(.+)@(.+)\.(.+)$/),
        alphanumeric: Attributes.init("regex", /^[\dA-Za-z]+$/),
        alphaonly: Attributes.init("regex", /^[A-Za-z]+$/),
        lowercase: Attributes.init("regex", /^[a-z]*$/),
        uppercase: Attributes.init("regex", /^[A-Z]*$/),
        // Numeric
        integer: Attributes.init("divisibility", 1)
    })
}
