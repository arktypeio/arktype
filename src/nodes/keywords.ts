import { Node } from "./node.js"

export type Keyword = keyof Keywords

export type Keywords = {
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
    // Regex
    email: string
    alphanumeric: string
    alphaonly: string
    lowercase: string
    uppercase: string
    // Numeric
    integer: number
}

export const keywords = {
    // TS keywords
    any: { always: "any" },
    bigint: { bigint: true },
    boolean: { boolean: true },
    false: { boolean: { literal: false } },
    never: {
        never: "explicitly typed as never"
    },
    null: { null: true },
    number: { number: true },
    object: { object: true },
    string: { string: true },
    symbol: { symbol: true },
    true: { boolean: { literal: true } },
    undefined: { undefined: true },
    unknown: { always: "unknown" },
    void: { undefined: true },
    // JS Object types
    Function: { object: { subtype: "function" } },
    // Regex
    email: { string: { regex: ["/^(.+)@(.+)\\.(.+)$/"] } },
    alphanumeric: { string: { regex: ["/^[dA-Za-z]+$/"] } },
    alphaonly: { string: { regex: ["/^[A-Za-z]+$/"] } },
    lowercase: { string: { regex: ["/^[a-z]*$/"] } },
    uppercase: { string: { regex: ["/^[A-Z]*$/"] } },
    // Numeric
    integer: { number: { divisor: 1 } }
} as const satisfies { [k in Keyword]: Node }
