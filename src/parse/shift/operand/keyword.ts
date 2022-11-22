import type { TypeNode } from "../../../nodes/node.js"
import type { array, dictionary } from "../../../utils/dynamicTypes.js"

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

    export const attributes: { [k in Keyword]: TypeNode } = {
        // TS keywords
        any: { caseless: "always", keyword: "any" },
        bigint: { bigint: {} },
        boolean: { boolean: {} },
        false: { boolean: { value: "false" } },
        never: {
            caseless: "never",
            reason: "explicitly typed as never"
        },
        null: { null: {} },
        number: { number: {} },
        object: {
            dictionary: {},
            array: {},
            function: {}
        },
        string: { string: {} },
        symbol: { symbol: {} },
        true: { boolean: { value: "true" } },
        undefined: { undefined: {} },
        unknown: { caseless: "always", keyword: "unknown" },
        void: { undefined: {} },
        // JS Object types
        Function: { function: {} },
        // Supplemental types
        array: { array: {} },
        dictionary: { dictionary: {} },
        // Regex
        email: { string: { regex: { "/^(.+)@(.+)\\.(.+)$/": true } } },
        alphanumeric: { string: { regex: { "/^[dA-Za-z]+$/": true } } },
        alphaonly: { string: { regex: { "/^[A-Za-z]+$/": true } } },
        lowercase: { string: { regex: { "/^[a-z]*$/": true } } },
        uppercase: { string: { regex: { "/^[A-Z]*$/": true } } },
        // Numeric
        integer: { number: { divisor: 1 } }
    }
}
