import type { ScopeRoot } from "../scope.ts"
import type { Domain } from "../utils/domains.ts"
import { deepFreeze } from "../utils/freeze.ts"
import type { TypeNode, TypeSet } from "./node.ts"
import { compileNodes } from "./node.ts"

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
    Function: { object: { subdomain: "Function" } },
    // Regex
    email: { string: { regex: "^(.+)@(.+)\\.(.+)$" } },
    alphanumeric: { string: { regex: "^[dA-Za-z]+$" } },
    alpha: { string: { regex: "^[A-Za-z]+$" } },
    lowercase: { string: { regex: "^[a-z]*$" } },
    uppercase: { string: { regex: "^[A-Z]*$" } },
    // Numeric
    integer: { number: { divisor: 1 } }
} as const satisfies Record<Keyword, TypeSet>)

// TODO: Add Set, Map
export const functorKeywords = {
    Array: (node: TypeNode): TypeSet => ({
        object: {
            subdomain: ["Array", node]
        }
    }),
    Set: (node: TypeNode): TypeSet => ({
        object: {
            subdomain: ["Set", node]
        }
    }),
    Map: (k: TypeNode, v: TypeNode): TypeSet => ({
        object: {
            subdomain: ["Map", k, v]
        }
    })
}

// Use a dummy scope here since we know there are no alias references
export const flatKeywords = compileNodes(keywords, {} as ScopeRoot)

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
