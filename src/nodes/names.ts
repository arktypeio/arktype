import type { ScopeRoot } from "../scope.js"
import { deepFreeze } from "../utils/freeze.js"
import type { narrow } from "../utils/generics.js"
import { isKeyOf } from "../utils/generics.js"
import { intersection } from "./intersection.js"
import type { Node } from "./node.js"

const defineKeywords = <definitions extends { [keyword in Keyword]: Node }>(
    definitions: narrow<definitions>
) => deepFreeze(definitions)

export const keywords = defineKeywords({
    // TS keywords
    any: "any",
    bigint: { bigint: true },
    boolean: { boolean: true },
    false: { boolean: { literal: false } },
    never: "never",
    null: { null: true },
    number: { number: true },
    object: { object: true },
    string: { string: true },
    symbol: { symbol: true },
    true: { boolean: { literal: true } },
    undefined: { undefined: true },
    unknown: "unknown",
    void: { undefined: true },
    // JS Object types
    Function: { object: { subtype: "function" } },
    // Regex
    email: { string: { regex: "^(.+)@(.+)\\.(.+)$" } },
    alphanumeric: { string: { regex: "^[dA-Za-z]+$" } },
    alphaonly: { string: { regex: "^[A-Za-z]+$" } },
    lowercase: { string: { regex: "^[a-z]*$" } },
    uppercase: { string: { regex: "^[A-Z]*$" } },
    // Numeric
    integer: { number: { divisor: 1 } }
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

export const nameIntersection = (
    name: string,
    node: Node,
    scope: ScopeRoot
): Node => {
    const l = resolveName(name, scope)
    const r = typeof node === "string" ? resolveName(node, scope) : node
    if (typeof l === "string") {
        return degenerateIntersection(l as DegenerateKeyword, node)
    }
    if (typeof r === "string") {
        return degenerateIntersection(r as DegenerateKeyword, l)
    }
    return intersection(l, r, scope)
}

const degenerateTypeNames = deepFreeze({
    never: true,
    unknown: true,
    any: true
})

export type DegenerateKeyword = keyof typeof degenerateTypeNames

export const degenerateIntersection = (
    keyword: DegenerateKeyword,
    withNode: Node
): Node =>
    keyword === "never" || withNode === "never"
        ? "never"
        : keyword === "any" || withNode === "any"
        ? "any"
        : withNode

const resolveName = (name: string, scope: ScopeRoot) =>
    isKeyOf(name, keywords) ? keywords[name] : scope.resolve(name)
