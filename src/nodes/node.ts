import { compileDisjointReasonsMessage } from "../parse/ast/intersection.ts"
import type { ParseContext } from "../parse/definition.ts"
import type { Type, TypeConfig } from "../scopes/type.ts"
import type { Domain, inferDomain } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type { defined, Dict, mutable, stringKeyOf } from "../utils/generics.ts"
import { hasKey, hasKeys, objectKeysOf } from "../utils/generics.ts"
import { Path } from "../utils/paths.ts"
import type { MorphEntry } from "./branch.ts"
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
    predicateUnion
} from "./predicate.ts"
import { mappedKeys } from "./rules/props.ts"
import type { LiteralRules, RuleEntry } from "./rules/rules.ts"

export type TypeNode<$ = Dict> = Identifier<$> | ResolvedNode<$>

export type Identifier<$ = Dict> = stringKeyOf<$>

export type ResolvedNode<$ = Dict> = {
    readonly [domain in Domain]?: Predicate<domain, $>
}

export const nodeIntersection: Intersector<TypeNode> = (l, r, state) => {
    state.domain = undefined
    const lResolution = state.type.meta.scope.resolveNode(l)
    const rResolution = state.type.meta.scope.resolveNode(r)
    const result = resolutionIntersection(lResolution, rResolution, state)
    if (typeof result === "object" && !hasKeys(result)) {
        return hasKeys(state.disjoints)
            ? anonymousDisjoint()
            : state.addDisjoint(
                  "domain",
                  objectKeysOf(lResolution),
                  objectKeysOf(rResolution)
              )
    }
    return result === lResolution ? l : result === rResolution ? r : result
}

const resolutionIntersection = composeKeyedIntersection<ResolvedNode>(
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

export const rootIntersection = (
    l: TypeNode,
    r: TypeNode,
    type: Type
): TypeNode => {
    const state = new IntersectionState(type, "&")
    const result = nodeIntersection(l, r, state)
    return isDisjoint(result)
        ? throwParseError(compileDisjointReasonsMessage(state.disjoints))
        : isEquality(result)
        ? l
        : result
}

export const rootUnion = (
    l: TypeNode,
    r: TypeNode,
    type: Type
): ResolvedNode => {
    const lResolution = type.meta.scope.resolveNode(l)
    const rResolution = type.meta.scope.resolveNode(r)
    const result = {} as mutable<ResolvedNode>
    const domains = objectKeysOf({ ...lResolution, ...rResolution })
    for (const domain of domains) {
        result[domain] = hasKey(lResolution, domain)
            ? hasKey(rResolution, domain)
                ? predicateUnion(
                      domain,
                      lResolution[domain],
                      rResolution[domain],
                      type
                  )
                : lResolution[domain]
            : hasKey(rResolution, domain)
            ? rResolution[domain]
            : throwUndefinedOperandsError()
    }
    return result
}

export type TraversalNode = Domain | TraversalEntry[]

export type TraversalKey = TraversalEntry[0]

export type TraversalValue<k extends TraversalKey> = Extract<
    TraversalEntry,
    [k, unknown]
>[1]

export type TraversalEntry =
    | RuleEntry
    | DomainsEntry
    | MorphEntry
    | CyclicReferenceEntry
    | DomainEntry
    | BranchesEntry
    | SwitchEntry
    | ConfigEntry

export type CyclicReferenceEntry = ["alias", string]

export type ConfigEntry = [
    "config",
    {
        config: TypeConfig
        node: TraversalNode
    }
]

export type DomainEntry = ["domain", Domain]

const hasImpliedDomain = (flatPredicate: TraversalEntry[]) =>
    flatPredicate[0] &&
    (flatPredicate[0][0] === "value" || flatPredicate[0][0] === "class")

export type DomainsEntry = [
    "domains",
    {
        readonly [domain in Domain]?: TraversalEntry[]
    }
]

export type BranchesEntry = ["branches", TraversalEntry[][]]

export type SwitchEntry = ["switch", DiscriminatedSwitch]

export type FlattenContext = ParseContext & {
    lastDomain: Domain
}

export const flattenType = (type: Type): TraversalNode => {
    const ctx: FlattenContext = {
        type,
        path: new Path(),
        lastDomain: "undefined"
    }
    return type.meta.config
        ? [
              [
                  "config",
                  {
                      config: type.meta.config,
                      node: flattenNode(type.node, ctx)
                  }
              ]
          ]
        : flattenNode(type.node, ctx)
}

export const flattenNode = (
    node: TypeNode,
    ctx: FlattenContext
): TraversalNode => {
    if (typeof node === "string") {
        const resolution = ctx.type.meta.scope.resolve(node)
        const updatedScopeConfig =
            resolution.meta.scope !== ctx.type.meta.scope &&
            resolution.meta.scope.config
        return updatedScopeConfig
            ? [
                  [
                      "config",
                      {
                          config: updatedScopeConfig,
                          node: resolution.flat
                      }
                  ]
              ]
            : resolution.flat
    }
    const domains = objectKeysOf(node)
    if (domains.length === 1) {
        const domain = domains[0]
        const predicate = node[domain]!
        if (predicate === true) {
            return domain
        }
        ctx.lastDomain = domain
        const flatPredicate = flattenPredicate(predicate, ctx)
        return hasImpliedDomain(flatPredicate)
            ? flatPredicate
            : [["domain", domain], ...flatPredicate]
    }
    const result: mutable<DomainsEntry[1]> = {}
    for (const domain of domains) {
        ctx.lastDomain = domain
        result[domain] = flattenPredicate(node[domain]!, ctx)
    }
    return [["domains", result]]
}

export type LiteralNode<
    domain extends Domain = Domain,
    value extends inferDomain<domain> = inferDomain<domain>
> = {
    [k in domain]: LiteralRules<domain, value>
}

export const isLiteralNode = <domain extends Domain>(
    node: ResolvedNode,
    domain: domain
): node is LiteralNode<domain> => {
    return (
        resolutionExtendsDomain(node, domain) &&
        isLiteralCondition(node[domain])
    )
}

export type DomainSubtypeResolution<domain extends Domain> = {
    readonly [k in domain]: defined<ResolvedNode[domain]>
}

export const resolutionExtendsDomain = <domain extends Domain>(
    resolution: ResolvedNode,
    domain: domain
): resolution is DomainSubtypeResolution<domain> => {
    const domains = objectKeysOf(resolution)
    return domains.length === 1 && domains[0] === domain
}

export const toArrayNode = (node: TypeNode): ResolvedNode => ({
    object: {
        class: "Array",
        props: {
            [mappedKeys.index]: node
        }
    }
})
