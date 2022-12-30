import type { aliasOf, Scope } from "../scope.ts"
import type { Domain } from "../utils/domains.ts"
import type { autocomplete, Dict, mutable } from "../utils/generics.ts"
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

export type TypeNode<aliases = Dict> = Identifier<aliases> | TypeSet<aliases>

/** If scope is provided, we also narrow each predicate to match its domain.
 * Otherwise, we use a base predicate for all types, which is easier to
 * manipulate.*/
export type TypeSet<aliases = Dict> = {
    readonly [domain in Domain]?: Predicate<domain, aliases>
}

export type Identifier<aliases> = string extends keyof aliases
    ? autocomplete<Keyword>
    : Keyword | aliasOf<aliases>

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

export const compileNode = (node: TypeNode, scope: Scope): TraversalNode => {
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
    scope: Scope
) => {
    const result = {} as Record<keyof nodes, TraversalNode>
    for (const name in nodes) {
        result[name] = compileNode(nodes[name], scope)
    }
    return result
}
