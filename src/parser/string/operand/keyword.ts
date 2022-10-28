import { InternalAttributes } from "../../../attributes/attributes.js"
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
            Record<Keyword, InternalAttributes>
        >
    ) => keywordsToAttributes

    // TODO: Impact of freezing these?
    const attributes = defineKeywordAttributes({
        // TS keywords
        any: InternalAttributes.init("noop"),
        bigint: InternalAttributes.init("type", "bigint"),
        boolean: InternalAttributes.init("type", "boolean"),
        false: InternalAttributes.init("value", false),
        // TODO: Add never
        never: InternalAttributes.init("type", "never"),
        null: InternalAttributes.init("value", null),
        number: InternalAttributes.init("type", "number"),
        object:
            // Unfortunately, since the TS object keyword can be one of three
            // types within our dynamic type system, creating an accurate node
            // is cumbersome.
            InternalAttributes.reduce(
                "union",
                InternalAttributes.reduce(
                    "union",
                    InternalAttributes.init("type", "dictionary"),
                    InternalAttributes.init("type", "array")
                ),
                InternalAttributes.init("type", "function")
            ),
        string: InternalAttributes.init("type", "string"),
        symbol: InternalAttributes.init("type", "symbol"),
        true: InternalAttributes.init("value", true),
        undefined: InternalAttributes.init("value", undefined),
        unknown: InternalAttributes.init("noop"),
        void: InternalAttributes.init("value", undefined),
        // JS Object types
        Function: InternalAttributes.init("type", "function"),
        // Supplemental types
        array: InternalAttributes.init("type", "array"),
        dictionary: InternalAttributes.init("type", "dictionary"),
        // Regex
        email: InternalAttributes.init("regex", /^(.+)@(.+)\.(.+)$/),
        alphanumeric: InternalAttributes.init("regex", /^[\dA-Za-z]+$/),
        alphaonly: InternalAttributes.init("regex", /^[A-Za-z]+$/),
        lowercase: InternalAttributes.init("regex", /^[a-z]*$/),
        uppercase: InternalAttributes.init("regex", /^[A-Z]*$/),
        // Numeric
        integer: InternalAttributes.init("divisibility", 1)
    })
}
