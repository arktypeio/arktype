import type { ScopeRoot } from "../scope.js"
import type { Domain } from "../utils/domains.js"
import type { Dict, mutable, stringKeyOf } from "../utils/generics.js"
import { keysOf } from "../utils/generics.js"
import type { Keyword } from "./keywords.js"
import type { FlatPredicate, Predicate } from "./predicate.js"
import { flattenPredicate } from "./predicate.js"
import { resolveIfIdentifier } from "./utils.js"

export type TypeNode<scope extends Dict = Dict> =
    | Identifier<scope>
    | TypeSet<scope>

export type FlatNode = Domain | FlatSingleDomainNode | FlatMultiDomainNode

export type FlatSingleDomainNode = [["domain", Domain], ...FlatPredicate]

export type FlatMultiDomainNode = [["domains", FlatTypeSet]]

export type FlatTypeSet = {
    readonly [domain in Domain]?: FlatPredicate
}

/** If scope is provided, we also narrow each predicate to match its domain.
 * Otherwise, we use a base predicate for all types, which is easier to
 * manipulate.*/
export type TypeSet<scope extends Dict = Dict> = {
    readonly [domain in Domain]?: string extends keyof scope
        ? Predicate
        : Predicate<domain, scope>
}

export type Identifier<scope extends Dict = Dict> = Keyword | stringKeyOf<scope>

export const flattenNode = (node: TypeNode, scope: ScopeRoot): FlatNode => {
    const resolution = resolveIfIdentifier(node, scope)
    const domains = keysOf(resolution)
    if (domains.length === 1) {
        const domain = domains[0]
        const predicate = resolution[domain]!
        if (predicate === true) {
            return domain
        }
        return [["domain", domain], ...flattenPredicate(predicate, scope)]
    }
    const result: mutable<FlatTypeSet> = {}
    for (const domain of domains) {
        result[domain] = flattenPredicate(resolution[domain]!, scope)
    }
    return [["domains", result]]
}

export const flattenNodes = <nodes extends { readonly [k in string]: TypeSet }>(
    nodes: nodes,
    scope: ScopeRoot
) => {
    const result = {} as { [k in keyof nodes]: FlatNode }
    for (const name in nodes) {
        result[name] = flattenNode(nodes[name], scope)
    }
    return result
}
