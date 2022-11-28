import type { ScopeRoot } from "../../scope.js"
import type { xor } from "../../utils/generics.js"
import { hasType } from "../../utils/typeOf.js"
import { compareTypes, intersection } from "../intersection.js"
import { keywords } from "../keywords.js"
import type { Comparison, Node, TypeNode } from "../node.js"

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

export const compareDegenerate = (
    l: Node,
    r: Node,
    scope: ScopeRoot
): Comparison<Node> => {
    const lKind = getDegenerateKind(l) ?? "t"
    const rKind = getDegenerateKind(r) ?? "t"
    if (lKind === "alias" || rKind === "alias") {
        l = resolveIfAlias(l, scope)
        r = resolveIfAlias(r, scope)
        return compareDegenerate(l, r, scope)
    }
    const resultKeys = [
        excludeDegenerateLookup[lKind][rKind],
        degenerateIntersectionLookup[lKind][rKind],
        excludeDegenerateLookup[rKind][lKind]
    ]
    return resultKeys.map((k) =>
        k === "t" ? (lKind === "t" ? l : r) : keywords[k]
    ) as Comparison<Node>
}

// TODO: Ensure can't resolve to another alias here
export const resolveIfAlias = (node: Node, scope: ScopeRoot) =>
    (node.alias ? scope.resolve(node.alias) : node) as xor<
        TypeNode,
        xor<Always, Never>
    >

const degenerateIntersectionLookup = {
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
} as const satisfies DegenerateOperationLookups

const excludeDegenerateLookup = {
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
} as const satisfies DegenerateOperationLookups

type UnresolvableDegenerateLookupKey = "never" | "any" | "unknown" | "t"

type DegenerateOperationLookups = Record<
    UnresolvableDegenerateLookupKey,
    Record<UnresolvableDegenerateLookupKey, UnresolvableDegenerateLookupKey>
>
