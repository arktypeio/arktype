import { flattenAll } from "../nodes/flatten.js"
import type { TypeSet } from "../nodes/node.js"
import type { Domain } from "../utils/domains.js"
import { deepFreeze } from "../utils/freeze.js"

const always: Record<Domain, true> = {
    bigint: true,
    boolean: true,
    null: true,
    number: true,
    object: true,
    string: true,
    symbol: true,
    undefined: true
}

export const keywords = deepFreeze({
    // TS keywords
    any: always,
    bigint: { bigint: true },
    boolean: { boolean: true },
    false: { boolean: { value: false } },
    never: {},
    null: { null: true },
    number: { number: true },
    object: { object: true },
    string: { string: true },
    symbol: { symbol: true },
    true: { boolean: { value: true } },
    unknown: always,
    void: { undefined: true },
    undefined: { undefined: true },
    // JS Object types
    Function: { object: { kind: "Function" } },
    // Regex
    email: { string: { regex: "^(.+)@(.+)\\.(.+)$" } },
    alphanumeric: { string: { regex: "^[dA-Za-z]+$" } },
    alpha: { string: { regex: "^[A-Za-z]+$" } },
    lowercase: { string: { regex: "^[a-z]*$" } },
    uppercase: { string: { regex: "^[A-Z]*$" } },
    // Numeric
    integer: { number: { divisor: 1 } }
} as const satisfies Record<Keyword, TypeSet>)

export const flattenedKeywords = flattenAll(keywords)

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
    // TODO: Add remaining JS object types
    // JS Object types
    Function: Function
    // Regex
    email: string
    alphanumeric: string
    alpha: string
    lowercase: string
    uppercase: string
    // Numeric
    integer: number
}
