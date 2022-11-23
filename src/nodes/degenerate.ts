import type { ScopeRoot } from "../scope.js"
import { keywords } from "./keywords.js"
import type { TypeNode } from "./node.js"
import type { NodeOperator } from "./operation.js"
import { operation } from "./operation.js"

export const degenerateOperation = (
    operator: NodeOperator,
    l: TypeNode,
    r: TypeNode,
    scope: ScopeRoot
): TypeNode => {
    if (l.degenerate === "alias" || r.degenerate === "alias") {
        return operation(
            operator,
            resolveIfAlias(l, scope),
            resolveIfAlias(r, scope),
            scope
        )
    }
    const lookupKeyA = l.degenerate ?? "t"
    const lookupKeyB = r.degenerate ?? "t"
    const resultKey =
        operator === "&"
            ? degenerateIntersections[lookupKeyA][lookupKeyB]
            : degenerateDifferences[lookupKeyA][lookupKeyB]
    return resultKey === "t"
        ? lookupKeyA === "t"
            ? l
            : r
        : keywords[resultKey]
}

const resolveIfAlias = (node: TypeNode, scope: ScopeRoot) =>
    node.degenerate === "alias" ? scope.resolve(node.name) : node

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
