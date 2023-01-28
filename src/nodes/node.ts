import { compileDisjointReasonsMessage } from "../parse/string/ast.ts"
import type { Scope } from "../scope.ts"
import type { Domain } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type { Dict, mutable, stringKeyOf } from "../utils/generics.ts"
import { hasKey, hasKeys, keysOf } from "../utils/generics.ts"
import type { Intersector } from "./compose.ts"
import {
    anonymousDisjoint,
    composeKeyedIntersection,
    IntersectionState,
    isDisjoint,
    isEquality,
    throwUndefinedOperandsError
} from "./compose.ts"
import type { DiscriminatedSwitch } from "./discriminate.ts"
import type { Predicate } from "./predicate.ts"
import {
    flattenPredicate,
    isLiteralCondition,
    predicateIntersection,
    predicateUnion,
    resolutionExtendsDomain
} from "./predicate.ts"
import type { BranchEntry, LiteralRules } from "./rules/rules.ts"

// TODO: should Type be allowed as a node? would allow configs etc. during traversal
export type TypeReference<$ = Dict> = Identifier<$> | TypeNode<$>

/** If scope is provided, we also narrow each predicate to match its domain.
 * Otherwise, we use a base predicate for all types, which is easier to
 * manipulate.*/
export type TypeNode<$ = Dict> = {
    readonly [domain in Domain]?: Predicate<domain, $>
}

export type Identifier<$ = Dict> = stringKeyOf<$>

export const nodeIntersection: Intersector<TypeReference> = (l, r, state) => {
    const lResolution = state.$.resolveNode(l)
    const rResolution = state.$.resolveNode(r)
    const result = resolutionIntersection(lResolution, rResolution, state)
    if (typeof result === "object" && !hasKeys(result)) {
        return hasKeys(state.disjoints)
            ? anonymousDisjoint()
            : state.addDisjoint(
                  "domain",
                  keysOf(lResolution),
                  keysOf(rResolution)
              )
    }
    return result === lResolution ? l : result === rResolution ? r : result
}

const resolutionIntersection = composeKeyedIntersection<TypeNode>(
    (domain, l, r, context) => {
        if (l === undefined) {
            return r === undefined ? throwUndefinedOperandsError() : undefined
        }
        if (r === undefined) {
            return undefined
        }
        return predicateIntersection(domain, l, r, context)
    },
    { onEmpty: "omit" }
)

/** Reflects that an Idenitifier cannot be the result of any intersection
 * including a TypeResolution  */
type IntersectionResult<
    l extends TypeReference,
    r extends TypeReference
> = l extends TypeNode
    ? TypeNode
    : r extends TypeNode
    ? TypeNode
    : TypeReference

export const intersection = <l extends TypeReference, r extends TypeReference>(
    l: l,
    r: r,
    $: Scope
) => {
    const state = new IntersectionState($)
    const result = nodeIntersection(l, r, state)
    return (
        isDisjoint(result)
            ? throwParseError(compileDisjointReasonsMessage(state.disjoints))
            : isEquality(result)
            ? l
            : result
    ) as IntersectionResult<l, r>
}

export const union = (
    l: TypeReference,
    r: TypeReference,
    $: Scope
): TypeNode => {
    const lResolution = $.resolveNode(l)
    const rResolution = $.resolveNode(r)
    const result = {} as mutable<TypeNode>
    const domains = keysOf({ ...lResolution, ...rResolution })
    for (const domain of domains) {
        result[domain] = hasKey(lResolution, domain)
            ? hasKey(rResolution, domain)
                ? predicateUnion(
                      domain,
                      lResolution[domain],
                      rResolution[domain],
                      $
                  )
                : lResolution[domain]
            : hasKey(rResolution, domain)
            ? rResolution[domain]
            : throwUndefinedOperandsError()
    }
    return result
}

export type TraversalNode = Domain | TraversalEntry[]

export type TraversalEntry =
    | BranchEntry
    | DomainsEntry
    | CyclicReferenceEntry
    | DomainEntry
    | BranchesEntry
    | SwitchEntry

export type TraversalKey = TraversalEntry[0]

export type CyclicReferenceEntry = ["alias", string]

export type DomainEntry = ["domain", Domain]

const hasImpliedDomain = (flatPredicate: TraversalEntry[]) =>
    flatPredicate[0] &&
    (flatPredicate[0][0] === "subdomain" || flatPredicate[0][0] === "value")

export type DomainsEntry = [
    "domains",
    {
        readonly [domain in Domain]?: TraversalEntry[]
    }
]

export type BranchesEntry = ["branches", TraversalEntry[][]]

export type SwitchEntry = ["switch", DiscriminatedSwitch]

export const flattenNode = (node: TypeReference, $: Scope): TraversalNode => {
    if (typeof node === "string") {
        return $.resolve(node).flat
    }
    const domains = keysOf(node)
    if (domains.length === 1) {
        const domain = domains[0]
        const predicate = node[domain]!
        if (predicate === true) {
            return domain
        }
        const flatPredicate = flattenPredicate(predicate, $)
        return hasImpliedDomain(flatPredicate)
            ? flatPredicate
            : [["domain", domain], ...flatPredicate]
    }
    const result: mutable<DomainsEntry[1]> = {}
    for (const domain of domains) {
        result[domain] = flattenPredicate(node[domain]!, $)
    }
    return [["domains", result]]
}

export type ScopeNodes = { readonly [k in string]: TypeNode }

export type CompiledScopeNodes<nodes extends ScopeNodes> = {
    readonly [k in keyof nodes]: TraversalNode
}

export const flattenNodes = <nodes extends ScopeNodes>(
    nodes: nodes,
    $: Scope
): CompiledScopeNodes<nodes> => {
    const result = {} as mutable<CompiledScopeNodes<nodes>>
    for (const name in nodes) {
        result[name] = flattenNode(nodes[name], $)
    }
    return result
}

export const isLiteralNode = <domain extends Domain>(
    resolution: TypeNode,
    domain: domain
): resolution is { [_ in domain]: LiteralRules<domain> } => {
    return (
        resolutionExtendsDomain(resolution, domain) &&
        isLiteralCondition(resolution[domain])
    )
}
