import type { ScopeRoot } from "../scope.js"
import type { Domain } from "../utils/domains.js"
import type { defined } from "../utils/generics.js"
import { keysOf } from "../utils/generics.js"
import type { TypeNode, TypeSet } from "./node.js"
import type { ExactValue, Predicate } from "./predicate.js"

export const resolveIfIdentifier = (
    node: TypeNode,
    scope: ScopeRoot
): TypeSet =>
    typeof node === "string" ? (scope.resolve(node) as TypeSet) : node

export const resolvePredicateIfIdentifier = (
    domain: Domain,
    predicate: Predicate,
    scope: ScopeRoot
) =>
    typeof predicate === "string"
        ? scope.resolvePredicate(predicate, domain)
        : predicate

export const isExactValue = <domain extends Domain>(
    node: TypeNode,
    domain: domain,
    scope: ScopeRoot
): node is { [_ in domain]: ExactValue<domain> } => {
    const resolution = resolveIfIdentifier(node, scope)
    return (
        nodeExtendsDomain(resolution, domain, scope) &&
        isExactValuePredicate(resolution[domain])
    )
}

export const isExactValuePredicate = (
    predicate: Predicate
): predicate is ExactValue =>
    typeof predicate === "object" && "value" in predicate

export const domainsOfNode = (node: TypeNode, scope: ScopeRoot): Domain[] =>
    keysOf(resolveIfIdentifier(node, scope))

export type DomainSubtypeNode<domain extends Domain> = {
    readonly [k in domain]: defined<TypeSet[domain]>
}

export const nodeExtendsDomain = <domain extends Domain>(
    node: TypeNode,
    domain: domain,
    scope: ScopeRoot
): node is DomainSubtypeNode<domain> => {
    const nodeDomains = domainsOfNode(node, scope)
    return nodeDomains.length === 1 && nodeDomains[0] === domain
}
