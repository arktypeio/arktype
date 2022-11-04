import type { array, dictionary } from "../../utils/dynamicTypes.js"
import type { Attributes } from "../state/attributes.js"

export type Keyword = keyof Keyword.Inferences

export namespace Keyword {
    export type Inferences = {
        // TS keywords
        any: any
        bigint: bigint
        boolean: boolean
        false: false
        never: never
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

    export const attributes: { readonly [k in Keyword]: Attributes } = {
        // TS keywords
        any: {},
        bigint: { type: "bigint" },
        boolean: { type: "boolean" },
        false: { value: "false" },
        never: {
            contradictions: {
                never: true
            }
        },
        null: { value: "null" },
        number: { type: "number" },
        object: {
            type: {
                dictionary: true,
                array: true,
                function: true
            }
        },
        string: { type: "string" },
        symbol: { type: "symbol" },
        true: { value: "true" },
        undefined: { value: "undefined" },
        unknown: {},
        void: { value: "undefined" },
        // JS Object types
        Function: { type: "function" },
        // Supplemental types
        array: { type: "array" },
        dictionary: { type: "dictionary" },
        // Regex
        email: { type: "string", regex: "/^(.+)@(.+)\\.(.+)$/" },
        alphanumeric: { type: "string", regex: "/^[dA-Za-z]+$/" },
        alphaonly: { type: "string", regex: "/^[A-Za-z]+$/" },
        lowercase: { type: "string", regex: "/^[a-z]*$/" },
        uppercase: { type: "string", regex: "/^[A-Z]*$/" },
        // Numeric
        integer: { type: "number", divisor: 1 }
    }
}
