import { AttributeNode } from "../../../attributes/attributes.js"
import type { array, Conform, dictionary } from "../../../internal.js"

export type Keyword = keyof Keyword.Inferences

export namespace Keyword {
    const defineKeywordNodes = <keywordsToAttributes>(
        keywordsToAttributes: Conform<
            keywordsToAttributes,
            Record<Keyword, () => AttributeNode>
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
        token in nodeGetters

    export const getNode = (keyword: Keyword) => nodeGetters[keyword]()

    const nodeGetters = defineKeywordNodes({
        // TS keywords
        any: () => new AttributeNode(),
        bigint: () => AttributeNode.from("type", "bigint"),
        boolean: () => AttributeNode.from("type", "boolean"),
        false: () => AttributeNode.from("value", false),
        // TODO: Add never
        never: () => {
            throw new Error("Never?")
        },
        null: () => AttributeNode.from("value", null),
        number: () => AttributeNode.from("type", "number"),
        object: () =>
            // Unfortunately, since the TS object keyword can be one of three
            // types within our dynamic type system, creating an accurate node
            // is cumbersome.
            AttributeNode.from("type", "dictionary")
                .reduce("union", AttributeNode.from("type", "array"))
                .reduce("union", AttributeNode.from("type", "function")),
        string: () => AttributeNode.from("type", "string"),
        symbol: () => AttributeNode.from("type", "symbol"),
        true: () => AttributeNode.from("value", true),
        undefined: () => AttributeNode.from("value", undefined),
        unknown: () => new AttributeNode(),
        void: () => AttributeNode.from("value", undefined),
        // JS Object types
        Function: () => AttributeNode.from("type", "function"),
        // Supplemental types
        array: () => AttributeNode.from("type", "array"),
        dictionary: () => AttributeNode.from("type", "dictionary"),
        // Regex
        email: () => AttributeNode.from("regex", /^(.+)@(.+)\.(.+)$/),
        alphanumeric: () => AttributeNode.from("regex", /^[\dA-Za-z]+$/),
        alphaonly: () => AttributeNode.from("regex", /^[A-Za-z]+$/),
        lowercase: () => AttributeNode.from("regex", /^[a-z]*$/),
        uppercase: () => AttributeNode.from("regex", /^[A-Z]*$/),
        // Numeric
        integer: () => AttributeNode.from("divisor", 1)
    })
}
