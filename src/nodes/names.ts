import type { ScopeRoot } from "../scope.js"
import { deepFreeze } from "../utils/freeze.js"
import type { narrow } from "../utils/generics.js"
import type { Node } from "./node.js"

const defineKeywords = <definitions extends { [keyword in Keyword]: Node }>(
    definitions: narrow<definitions>
) => deepFreeze(definitions)

const always = [
    "bigint",
    "boolean",
    "null",
    "number",
    "object",
    "string",
    "symbol",
    "undefined"
] as const

export const keywords = defineKeywords({
    // TS keywords
    any: always,
    bigint: { type: "bigint" },
    boolean: { type: "boolean" },
    false: { type: "boolean", literal: false },
    never: [],
    null: { type: "null" },
    number: { type: "number" },
    object: { type: "object" },
    string: { type: "string" },
    symbol: { type: "symbol" },
    true: { type: "boolean", literal: true },
    undefined: { type: "undefined" },
    unknown: always,
    void: { type: "undefined" },
    // JS Object types
    Function: { type: "object", subtype: "function" },
    // Regex
    email: { type: "string", regex: "^(.+)@(.+)\\.(.+)$" },
    alphanumeric: { type: "string", regex: "^[dA-Za-z]+$" },
    alphaonly: { type: "string", regex: "^[A-Za-z]+$" },
    lowercase: { type: "string", regex: "^[a-z]*$" },
    uppercase: { type: "string", regex: "^[A-Z]*$" },
    // Numeric
    integer: { type: "number", divisor: 1 }
})

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

export const resolveIfName = (node: Node, scope: ScopeRoot) =>
    typeof node === "string" ? scope.resolve(node) : node
