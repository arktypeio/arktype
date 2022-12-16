import type { ScopeRoot } from "../scope.js"
import type { Domain, inferDomain } from "../utils/classify.js"
import type { defined } from "../utils/generics.js"
import { keysOf } from "../utils/generics.js"
import { intersection } from "./intersection.js"
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
): Exclude<Predicate, string> =>
    typeof predicate === "string"
        ? scope.resolveToDomain(predicate, domain)
        : predicate

export const nodeExtends = (node: TypeNode, base: TypeNode, scope: ScopeRoot) =>
    intersection(node, base, scope) === node

export const isExactValue = (
    node: TypeNode,
    domain: Domain,
    scope: ScopeRoot
): node is { [domain in Domain]: { value: inferDomain<domain> } } => {
    const resolution = resolveIfIdentifier(node, scope)
    return (
        nodeExtendsDomain(resolution, domain, scope) &&
        (resolution[domain] as ExactValue).value !== undefined
    )
}

export const domainOfNode = (
    node: TypeNode,
    scope: ScopeRoot
): Domain | Domain[] => {
    const domains = keysOf(resolveIfIdentifier(node, scope))
    // TODO: Handle never here
    return domains.length === 1 ? domains[0] : domains
}

export type DomainSubtypeNode<domain extends Domain> = {
    readonly [k in domain]: defined<TypeSet[domain]>
}

export const nodeExtendsDomain = <domain extends Domain>(
    node: TypeNode,
    domain: domain,
    scope: ScopeRoot
): node is DomainSubtypeNode<domain> => domainOfNode(node, scope) === domain
