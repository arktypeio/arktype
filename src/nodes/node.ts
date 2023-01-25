import { compileDisjointReasonsMessage } from "../parse/string/ast.ts"
import type { ScopeRoot } from "../scope.ts"
import type { Domain } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type {
    autocomplete,
    Dict,
    mutable,
    stringKeyOf
} from "../utils/generics.ts"
import { hasKey, hasKeys, keysOf } from "../utils/generics.ts"
import type { IntersectionContext, Intersector } from "./compose.ts"
import {
    anonymousDisjoint,
    composeKeyedIntersection,
    disjoint,
    isDisjoint,
    isEquality,
    throwUndefinedOperandsError
} from "./compose.ts"
import type { DiscriminatedSwitch } from "./discriminate.ts"
import type { Keyword } from "./keywords.ts"
import type { Predicate } from "./predicate.ts"
import {
    compilePredicate,
    predicateIntersection,
    predicateUnion
} from "./predicate.ts"
import { domainsOfNode, resolveFlat, resolveIfIdentifier } from "./resolve.ts"
import type { BranchEntry } from "./rules/rules.ts"

export type TypeNode<$ = Dict> = Identifier<$> | TypeResolution<$>

/** If scope is provided, we also narrow each predicate to match its domain.
 * Otherwise, we use a base predicate for all types, which is easier to
 * manipulate.*/
export type TypeResolution<$ = Dict> = {
    readonly [domain in Domain]?: Predicate<domain, $>
}

export type Identifier<$ = Dict> = string extends keyof $
    ? autocomplete<Keyword>
    : Keyword | stringKeyOf<$>

export const nodeIntersection: Intersector<TypeNode> = (l, r, context) => {
    const lResolution = resolveIfIdentifier(l, context.$)
    const rResolution = resolveIfIdentifier(r, context.$)
    const result = resolutionIntersection(lResolution, rResolution, context)
    if (typeof result === "object" && !hasKeys(result)) {
        return hasKeys(context.disjoints)
            ? anonymousDisjoint()
            : disjoint(
                  "domain",
                  [
                      domainsOfNode(lResolution, context.$),
                      domainsOfNode(rResolution, context.$)
                  ],
                  context
              )
    }
    return result === lResolution ? l : result === rResolution ? r : result
}

const resolutionIntersection = composeKeyedIntersection<TypeResolution>(
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

export const initializeIntersectionContext = (
    $: ScopeRoot
): IntersectionContext => ({
    $,
    path: "/",
    disjoints: {},
    morphs: {}
})

export const intersection = (l: TypeNode, r: TypeNode, $: ScopeRoot) => {
    const context = initializeIntersectionContext($)
    const result = nodeIntersection(l, r, context)
    return isDisjoint(result)
        ? throwParseError(compileDisjointReasonsMessage(context.disjoints))
        : isEquality(result)
        ? l
        : result
}

export const union = (l: TypeNode, r: TypeNode, $: ScopeRoot) => {
    const lResolution = resolveIfIdentifier(l, $)
    const rResolution = resolveIfIdentifier(r, $)
    const result = {} as mutable<TypeResolution>
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

export const compileNode = (node: TypeNode, $: ScopeRoot): TraversalNode => {
    if (typeof node === "string") {
        return resolveFlat(node, $)
    }
    const domains = keysOf(node)
    if (domains.length === 1) {
        const domain = domains[0]
        const predicate = node[domain]!
        if (predicate === true) {
            return domain
        }
        const flatPredicate = compilePredicate(predicate, $)
        return hasImpliedDomain(flatPredicate)
            ? flatPredicate
            : [["domain", domain], ...flatPredicate]
    }
    const result: mutable<DomainsEntry[1]> = {}
    for (const domain of domains) {
        result[domain] = compilePredicate(node[domain]!, $)
    }
    return [["domains", result]]
}

export type ScopeNodes = { readonly [k in string]: TypeResolution }

export type CompiledScopeNodes<nodes extends ScopeNodes> = {
    readonly [k in keyof nodes]: TraversalNode
}

export const compileNodes = <nodes extends ScopeNodes>(
    nodes: nodes,
    $: ScopeRoot
): CompiledScopeNodes<nodes> => {
    const result = {} as mutable<CompiledScopeNodes<nodes>>
    for (const name in nodes) {
        result[name] = compileNode(nodes[name], $)
    }
    return result
}
