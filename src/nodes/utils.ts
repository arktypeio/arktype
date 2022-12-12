import type { ScopeRoot } from "../scope.js"
import type { DomainName } from "../utils/domainOf.js"
import { filterSplit } from "../utils/filterSplit.js"
import type { defined } from "../utils/generics.js"
import { keysOf, listFrom } from "../utils/generics.js"
import { intersection } from "./intersection.js"
import type {
    Domain,
    TypeNode,
    UnknownDomain,
    UnknownPredicate,
    UnknownRule,
    UnknownTypeNode
} from "./node.js"

export const resolveIfIdentifier = (
    node: UnknownTypeNode,
    scope: ScopeRoot
): UnknownDomain => (typeof node === "string" ? scope.resolve(node) : node)

export const nodeExtends = (node: TypeNode, base: TypeNode, scope: ScopeRoot) =>
    intersection(node, base, scope) === node

export const domainOfNode = (
    node: TypeNode,
    scope: ScopeRoot
): DomainName | DomainName[] => {
    const domains = keysOf(resolveIfIdentifier(node, scope))
    // TODO: Handle never here
    return domains.length === 1 ? domains[0] : domains
}

export type DomainSubtypeNode<domain extends DomainName> = {
    readonly [k in domain]: defined<Domain[domain]>
}

export const nodeExtendsDomain = <domain extends DomainName>(
    node: TypeNode,
    domain: domain,
    scope: ScopeRoot
): node is DomainSubtypeNode<domain> => domainOfNode(node, scope) === domain

export const resolvePredicate = (
    domain: DomainName,
    predicate: UnknownPredicate,
    scope: ScopeRoot
): true | UnknownRule[] => {
    if (predicate === true) {
        return true
    }
    const [unresolved, resolved] = filterSplit(
        listFrom(predicate),
        (branch): branch is string => typeof branch === "string"
    )
    while (unresolved.length) {
        const typeResolution = scope.resolveConstraints(
            unresolved.pop()!,
            domain
        )
        if (typeResolution === true) {
            return true
        }
        for (const resolutionBranch of listFrom(typeResolution)) {
            if (typeof resolutionBranch === "string") {
                unresolved.push(resolutionBranch)
            } else {
                resolved.push(resolutionBranch)
            }
        }
    }
    return resolved
}
