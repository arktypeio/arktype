import type { ScopeRoot } from "../scope.js"
import type { Domain } from "../utils/domains.js"
import type { Dict, mutable, stringKeyOf } from "../utils/generics.js"
import type { Keyword } from "./keywords.js"
import type { FlatPredicate, Predicate } from "./predicate.js"
import { flattenPredicate } from "./predicate.js"
import { resolveIfIdentifier } from "./utils.js"

export type TypeNode<scope extends Dict = Dict> =
    | Identifier<scope>
    | TypeSet<scope>

export type FlatNode = {
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
    const result: mutable<FlatNode> = {}
    let domain: Domain
    const resolution = resolveIfIdentifier(node, scope)
    for (domain in resolution) {
        result[domain] = flattenPredicate(resolution[domain]!, scope)
    }
    return result
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
