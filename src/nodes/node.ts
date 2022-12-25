import type { S } from "../parse/definition.ts"
import type { ScopeRoot } from "../scope.ts"
import type { Domain } from "../utils/domains.ts"
import type { mutable } from "../utils/generics.ts"
import { keysOf } from "../utils/generics.ts"
import type { Keyword } from "./keywords.ts"
import type {
    ExactValueEntry,
    Predicate,
    TraversalPredicate
} from "./predicate.ts"
import { compilePredicate } from "./predicate.ts"
import type { TraversalSubdomainRule } from "./rules/subdomain.ts"
import { resolveIfIdentifier } from "./utils.ts"

export type TypeNode<s extends S = S> = Identifier<s> | TypeSet<s>

/** If scope is provided, we also narrow each predicate to match its domain.
 * Otherwise, we use a base predicate for all types, which is easier to
 * manipulate.*/
export type TypeSet<s extends S = S> = {
    readonly [domain in Domain]?: Predicate<domain, s>
}

export type Identifier<s extends S = S> =
    | Keyword
    | keyof s["inferred"]
    | keyof s["aliases"]

export type TraversalNode =
    | Domain
    | SingleDomainTraversalNode
    | MultiDomainTraversalNode

export type SingleDomainTraversalNode = readonly [
    ExplicitDomainEntry | ImplicitDomainEntry,
    ...TraversalPredicate
]

export type ExplicitDomainEntry = ["domain", Domain]

export type ImplicitDomainEntry =
    | ExactValueEntry
    | ["subdomain", TraversalSubdomainRule]

const hasImpliedDomain = (
    flatPredicate: TraversalPredicate | SingleDomainTraversalNode
): flatPredicate is SingleDomainTraversalNode =>
    flatPredicate[0] &&
    (flatPredicate[0][0] === "subdomain" || flatPredicate[0][0] === "value")

export type MultiDomainTraversalNode = [MultiDomainEntry]

export type MultiDomainEntry = ["domains", TraversalTypeSet]

export type TraversalTypeSet = {
    readonly [domain in Domain]?: TraversalPredicate
}

export const compileNode = (
    node: TypeNode,
    scope: ScopeRoot
): TraversalNode => {
    const resolution = resolveIfIdentifier(node, scope)
    const domains = keysOf(resolution)
    if (domains.length === 1) {
        const domain = domains[0]
        const predicate = resolution[domain]!
        if (predicate === true) {
            return domain
        }
        const flatPredicate = compilePredicate(domain, predicate, scope)
        return hasImpliedDomain(flatPredicate)
            ? flatPredicate
            : [["domain", domain], ...flatPredicate]
    }
    const result: mutable<TraversalTypeSet> = {}
    for (const domain of domains) {
        result[domain] = compilePredicate(domain, resolution[domain]!, scope)
    }
    return [["domains", result]]
}

export const compileNodes = <nodes extends { readonly [k in string]: TypeSet }>(
    nodes: nodes,
    scope: ScopeRoot
) => {
    const result = {} as Record<keyof nodes, TraversalNode>
    for (const name in nodes) {
        result[name] = compileNode(nodes[name], scope)
    }
    return result
}
