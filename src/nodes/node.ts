import { compileDisjointReasonsMessage } from "../parse/ast/intersection.ts"
import type { Type, TypeConfig } from "../scopes/type.ts"
import type { Domain, inferDomain } from "../utils/domains.ts"
import { throwInternalError, throwParseError } from "../utils/errors.ts"
import type { defined, Dict, mutable, stringKeyOf } from "../utils/generics.ts"
import { hasKey, hasKeys, keysOf } from "../utils/generics.ts"
import type { Intersector } from "./compose.ts"
import {
    anonymousDisjoint,
    composeKeyedIntersection,
    IntersectionState,
    isDisjoint,
    isEquality,
    undefinedOperandsMessage
} from "./compose.ts"
import type { Predicate } from "./predicate.ts"
import {
    isLiteralCondition,
    predicateIntersection,
    predicateUnion
} from "./predicate.ts"
import { mappedKeys } from "./rules/props.ts"
import type { LiteralRules } from "./rules/rules.ts"

export type Node<$ = Dict> = Identifier<$> | ResolvedNode<$>

export type Identifier<$ = Dict> = stringKeyOf<$>

export type ResolvedNode<$ = Dict> = DomainsNode<$> | ConfigNode<$>

export class _ResolvedNode<$ = Dict> {
    constructor(public domains: DomainsNode<$>, public config?: TypeConfig) {}
}

export type ConfigNode<$ = Dict> = {
    config: TypeConfig
    node: DomainsNode<$>
}

export const isConfigNode = (node: ResolvedNode): node is ConfigNode =>
    "config" in node

export type DomainsNode<$ = Dict> = {
    readonly [domain in Domain]?: Predicate<domain, $>
}

export const nodeIntersection: Intersector<Node> = (l, r, state) => {
    state.domain = undefined
    const lDomains = state.type.scope.resolveTypeNode(l)
    const rDomains = state.type.scope.resolveTypeNode(r)
    const result = typeNodeIntersection(lDomains, rDomains, state)
    if (typeof result === "object" && !hasKeys(result)) {
        return hasKeys(state.disjoints)
            ? anonymousDisjoint()
            : state.addDisjoint("domain", keysOf(lDomains), keysOf(rDomains))
    }
    return result === lDomains ? l : result === rDomains ? r : result
}

const typeNodeIntersection = composeKeyedIntersection<DomainsNode>(
    (domain, l, r, context) => {
        if (l === undefined) {
            return r === undefined
                ? throwInternalError(undefinedOperandsMessage)
                : undefined
        }
        if (r === undefined) {
            return undefined
        }
        return predicateIntersection(domain, l, r, context)
    },
    { onEmpty: "omit" }
)

export const rootIntersection = (l: Node, r: Node, type: Type): Node => {
    const state = new IntersectionState(type, "&")
    const result = nodeIntersection(l, r, state)
    return isDisjoint(result)
        ? throwParseError(compileDisjointReasonsMessage(state.disjoints))
        : isEquality(result)
        ? l
        : result
}

export const rootUnion = (l: Node, r: Node, type: Type): ResolvedNode => {
    const lDomains = type.scope.resolveTypeNode(l)
    const rDomains = type.scope.resolveTypeNode(r)
    const result = {} as mutable<DomainsNode>
    const domains = keysOf({ ...lDomains, ...rDomains })
    for (const domain of domains) {
        result[domain] = hasKey(lDomains, domain)
            ? hasKey(rDomains, domain)
                ? predicateUnion(
                      domain,
                      lDomains[domain],
                      rDomains[domain],
                      type
                  )
                : lDomains[domain]
            : hasKey(rDomains, domain)
            ? rDomains[domain]
            : throwInternalError(undefinedOperandsMessage)
    }
    return result
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
    readonly [k in domain]: defined<DomainsNode[domain]>
}

export const resolutionExtendsDomain = <domain extends Domain>(
    resolution: ResolvedNode,
    domain: domain
): resolution is DomainSubtypeResolution<domain> => {
    const domains = keysOf(resolution)
    return domains.length === 1 && domains[0] === domain
}

export const toArrayNode = (node: Node): ResolvedNode => ({
    object: {
        instance: Array,
        props: {
            [mappedKeys.index]: node
        }
    }
})
