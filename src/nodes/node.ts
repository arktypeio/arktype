import type { Morph } from "../parse/tuple.js"
import type { ScopeRoot } from "../scope.js"
import type { Domain } from "../utils/domains.js"
import type { Dict, mutable } from "../utils/generics.js"
import { keysOf } from "../utils/generics.js"
import type { Keyword } from "./keywords.js"
import type {
    ExactValueEntry,
    Predicate,
    TraversalPredicate
} from "./predicate.js"
import { compilePredicate } from "./predicate.js"
import type { TraversalSubdomainRule } from "./rules/subdomain.js"
import { resolveIfIdentifier } from "./utils.js"

export type Node<scope extends Dict = Dict> = MorphNode<scope> | TypeNode<scope>

// TODO: intratype-morph
export type MorphNode<scope extends Dict = Dict> = [
    TypeNode<scope>,
    "=>",
    TypeNode<scope>,
    Morph
]

export type TypeNode<scope extends Dict = Dict> =
    | Identifier<scope>
    | TypeSet<scope>

/** If scope is provided, we also narrow each predicate to match its domain.
 * Otherwise, we use a base predicate for all types, which is easier to
 * manipulate.*/
export type TypeSet<scope extends Dict = Dict> = {
    readonly [domain in Domain]?: Predicate<domain, scope>
}

export type Identifier<scope extends Dict = Dict> = Keyword | keyof scope

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
