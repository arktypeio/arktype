import type { ScopeRoot } from "../scope.js"
import type { Domain } from "../utils/classify.js"
import type { defined } from "../utils/generics.js"
import { keysOf, listFrom } from "../utils/generics.js"
import { filterSplit } from "../utils/objectUtils.js"
import { intersection } from "./intersection.js"
import type { RawTypeRoot, RawTypeSet, TypeSet } from "./node.js"
import type { Condition, Predicate } from "./predicate.js"

export const resolveIfIdentifier = (
    node: RawTypeRoot,
    scope: ScopeRoot
): RawTypeSet =>
    typeof node === "string" ? (scope.resolve(node) as RawTypeSet) : node

export const nodeExtends = (
    node: RawTypeRoot,
    base: RawTypeRoot,
    scope: ScopeRoot
) => intersection(node, base, scope) === node

export const domainOfNode = (
    node: RawTypeRoot,
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
    node: RawTypeRoot,
    domain: domain,
    scope: ScopeRoot
): node is DomainSubtypeNode<domain> => domainOfNode(node, scope) === domain

// TODO: string?
export const resolvePredicate = (
    domain: Domain,
    predicate: Predicate,
    scope: ScopeRoot
): true | Condition[] => {
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
