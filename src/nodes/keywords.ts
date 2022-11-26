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
    any: [{ type: "any" }],
    bigint: [{ type: "bigint" }],
    boolean: [{ type: "boolean" }],
    false: [{ type: "boolean", value: false }],
    never: [
        {
            type: "never",
            reason: "explicitly typed as never"
        }
    ],
    null: [{ type: "null" }],
    number: [{ type: "number" }],
    object: [{ type: "object" }],
    string: [{ type: "string" }],
    symbol: [{ type: "symbol" }],
    true: [{ type: "boolean", value: true }],
    undefined: [{ type: "undefined" }],
    unknown: [{ type: "unknown" }],
    void: [{ type: "undefined" }],
    // JS Object types
    Function: [{ type: "object", subtype: { kind: "function" } }],
    // Regex
    email: [{ type: "string", regex: ["/^(.+)@(.+)\\.(.+)$/"] }],
    alphanumeric: [{ type: "string", regex: ["/^[dA-Za-z]+$/"] }],
    alphaonly: [{ type: "string", regex: ["/^[A-Za-z]+$/"] }],
    lowercase: [{ type: "string", regex: ["/^[a-z]*$/"] }],
    uppercase: [{ type: "string", regex: ["/^[A-Z]*$/"] }],
    // Numeric
    integer: [{ type: "number", divisor: 1 }]
} as const satisfies { [k in Keyword]: Node }
