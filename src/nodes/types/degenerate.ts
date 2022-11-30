import type { xor } from "../../utils/generics.js"
import { keywords } from "../keywords.js"
import type { Node } from "../node.js"

export type DegenerateTypeName = "never" | "unknown" | "any"

export const isDegenerate = (node: Node): node is DegenerateTypeName =>
    node === "never" || node === "unknown" || node === "any"

export const isNever = (result: any): result is Never =>
    result?.never !== undefined

const getDegenerateKind = (node: Node) =>
    node.always ?? (node.never ? "never" : undefined)

export const degenerateIntersection = (l: Node, r: Node): Node => {
    const resultKey =
        degenerateIntersectionLookup[getDegenerateKind(l) ?? "t"][
            getDegenerateKind(r) ?? "t"
        ]
    return resultKey === "t" ? (isDegenerate(l) ? r : l) : keywords[resultKey]
}

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

type UnresolvableDegenerateLookupKey = "never" | "any" | "unknown" | "t"

type DegenerateOperationLookups = Record<
    UnresolvableDegenerateLookupKey,
    Record<UnresolvableDegenerateLookupKey, UnresolvableDegenerateLookupKey>
>
