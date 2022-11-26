import type { ScopeRoot } from "../../scope.js"
import type { record } from "../../utils/dataTypes.js"
import { isKeyOf } from "../../utils/generics.js"
import { intersect } from "../intersect.js"
import { keywords } from "../keywords.js"
import type { Node } from "../node.js"
import { prune } from "../prune.js"

export type DegenerateNode = Never | Any | Unknown | Alias

export type Never = readonly [
    { readonly type: "never"; readonly reason: string }
]

export type Any = readonly [{ readonly type: "any" }]

export type Unknown = readonly [{ readonly type: "unknown" }]

export type Alias = readonly [{ readonly type: "alias"; readonly name: string }]

const degenerateKeys = {
    alias: true,
    any: true,
    never: true,
    unknown: true
}

export const isDegenerate = (node: Node): node is DegenerateNode =>
    isKeyOf(node[0].type, degenerateKeys)

export const isAlias = (node: Node): node is Alias => node[0].type === "alias"

export const isAny = (node: Node): node is Any => node[0].type === "any"

export const isUnknown = (node: Node): node is Unknown =>
    node[0].type === "unknown"

export const isNever = (result: record<any>): result is Never =>
    result[0].type === "never"

export const intersectDegenerate = (l: Node, r: Node, scope: ScopeRoot) =>
    degenerateOperation("&", l, r, scope)

export const subtractDegenerate = (l: Node, r: Node, scope: ScopeRoot) =>
    degenerateOperation("-", l, r, scope)

const degenerateOperation = (
    operator: "&" | "-",
    l: Node,
    r: Node,
    scope: ScopeRoot
): Node => {
    if (isAlias(l) || isAlias(r)) {
        l = resolveIfAlias(l, scope)
        r = resolveIfAlias(r, scope)
        return operator === "&" ? intersect(l, r, scope) : prune(l, r, scope)
    }
    const firstKey = isDegenerate(l) ? l[0].type : "t"
    const secondKey = isDegenerate(r) ? r[0].type : "t"
    const resultKey =
        operator === "&"
            ? degenerateIntersections[firstKey][secondKey]
            : degenerateDifferences[firstKey][secondKey]
    return resultKey === "t" ? (firstKey === "t" ? l : r) : keywords[resultKey]
}

const resolveIfAlias = (node: Node, scope: ScopeRoot) =>
    isAlias(node) ? scope.resolve(node[0].name) : node

const degenerateIntersections = {
    any: {
        never: "never",
        any: "any",
        unknown: "any",
        t: "any"
    },
    never: {
        never: "never",
        any: "never",
        unknown: "never",
        t: "never"
    },
    unknown: {
        never: "never",
        any: "any",
        unknown: "unknown",
        t: "t"
    },
    t: {
        never: "never",
        any: "any",
        unknown: "unknown",
        // This should never happen as we should not be using these lookups
        // unless one of the nodes is degenerate
        t: "t"
    }
} satisfies DegenerateOperationLookups

const degenerateDifferences = {
    any: {
        never: "any",
        any: "never",
        unknown: "never",
        t: "any"
    },
    never: {
        never: "never",
        any: "never",
        unknown: "never",
        t: "never"
    },
    unknown: {
        never: "unknown",
        any: "never",
        unknown: "never",
        t: "unknown"
    },
    t: {
        never: "t",
        any: "never",
        unknown: "never",
        // Should never happen
        t: "never"
    }
} satisfies DegenerateOperationLookups

type UnresolvableDegenerateLookupKey = "never" | "any" | "unknown" | "t"

type DegenerateOperationLookups = Record<
    UnresolvableDegenerateLookupKey,
    Record<UnresolvableDegenerateLookupKey, UnresolvableDegenerateLookupKey>
>
