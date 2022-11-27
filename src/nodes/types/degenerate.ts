import type { ScopeRoot } from "../../scope.js"
import { hasObjectSubtype, hasType, typeOf } from "../../utils/dataTypes.js"
import { throwInternalError } from "../../utils/errors.js"
import type { xor } from "../../utils/generics.js"
import { hasKey, isKeyOf } from "../../utils/generics.js"
import { intersect } from "../intersect.js"
import { keywords } from "../keywords.js"
import type { Node } from "../node.js"
import { prune } from "../prune.js"

export type DegenerateNode = xor<Alias, xor<Always, Never>>

export type Never = { readonly never: string }

export type Always = { readonly always: "unknown" | "any" }

export type Alias = { readonly alias: string }

export const isDegenerate = (node: Node): node is DegenerateNode =>
    !!(node.alias || node.never || node.always)

export const isNever = (result: unknown): result is Never =>
    hasType(result, "object") && !!result.never

const getDegenerateKind = (node: Node) =>
    node.alias ? "alias" : node.always ?? (node.never ? "never" : undefined)

export const degenerateIntersection = (l: Node, r: Node, scope: ScopeRoot) =>
    degenerateOperation("&", l, r, scope)!

export const pruneDegenerate = (l: Node, r: Node, scope: ScopeRoot) =>
    degenerateOperation("-", l, r, scope)

const degenerateOperation = (
    operator: "&" | "-",
    l: Node,
    r: Node,
    scope: ScopeRoot
): Node | undefined => {
    const lKind = getDegenerateKind(l) ?? "t"
    const rKind = getDegenerateKind(r) ?? "t"
    if (lKind === "alias" || rKind === "alias") {
        l = resolveIfAlias(l, scope)
        r = resolveIfAlias(r, scope)
        return operator === "&" ? intersect(l, r, scope) : prune(l, r, scope)
    }
    const resultKey =
        operator === "&"
            ? intersectedDegenerates[lKind][rKind]
            : prunedDegenerates[lKind][rKind]
    return resultKey === "t" ? (lKind === "t" ? l : r) : keywords[resultKey]
}

const resolveIfAlias = (node: Node, scope: ScopeRoot) =>
    node.alias ? scope.resolve(node.alias) : node

const intersectedDegenerates = {
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

const prunedDegenerates = {
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
