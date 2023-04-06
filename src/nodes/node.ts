import { compileDisjointReasonsMessage } from "../parse/ast/intersection.js"
import type { ParseContext } from "../parse/definition.js"
import type { Type, TypeConfig } from "../scopes/type.js"
import type { Domain, inferDomain } from "../utils/domains.js"
import { throwInternalError, throwParseError } from "../utils/errors.js"
import type {
    defined,
    Dict,
    entryOf,
    mutable,
    stringKeyOf
} from "../utils/generics.ts"
import { entriesOf, hasKey, hasKeys, objectKeysOf } from "../utils/generics.js"
import { Path } from "../utils/paths.js"
import type { MorphEntry } from "./branch.js"
import type { Intersector } from "./compose.js"
import {
    anonymousDisjoint,
    composeKeyedIntersection,
    IntersectionState,
    isDisjoint,
    isEquality,
    undefinedOperandsMessage
} from "./compose.ts"
import type { DiscriminatedSwitch } from "./discriminate.js"
import type { Predicate } from "./predicate.js"
import {
    flattenPredicate,
    isLiteralCondition,
    predicateIntersection,
    predicateUnion
} from "./predicate.ts"
import { mappedKeys } from "./rules/props.js"
import type { LiteralRules, RuleEntry } from "./rules/rules.js"

export type Node<$ = Dict> = Identifier<$> | ResolvedNode<$>

export type Identifier<$ = Dict> = stringKeyOf<$>

/**
 * @operator {@link ResolvedNode | node}
 * @docgenTable
 * @tuple ["node", nodeDefinition]
 * @helper type.from(nodeDefinition)
 */
export type ResolvedNode<$ = Dict> = TypeNode<$> | ConfigNode<$>

export type ConfigNode<$ = Dict> = {
    config: TypeConfig
    node: TypeNode<$>
}

export const isConfigNode = (node: ResolvedNode): node is ConfigNode =>
    "config" in node

export type TypeNode<$ = Dict> = {
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
            : state.addDisjoint(
                  "domain",
                  objectKeysOf(lDomains),
                  objectKeysOf(rDomains)
              )
    }
    return result === lDomains ? l : result === rDomains ? r : result
}

const typeNodeIntersection = composeKeyedIntersection<TypeNode>(
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
    const result = {} as mutable<TypeNode>
    const domains = objectKeysOf({ ...lDomains, ...rDomains })
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
    | AliasEntry
    | DomainEntry
    | BranchesEntry
    | SwitchEntry
    | TraversalConfigEntry

export type AliasEntry = ["alias", string]

export type ConfigEntry = entryOf<TypeConfig>

export type TraversalConfigEntry = [
    "config",
    {
        config: ConfigEntry[]
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
    return flattenNode(type.node, ctx)
}

export const flattenNode = (node: Node, ctx: FlattenContext): TraversalNode => {
    if (typeof node === "string") {
        return ctx.type.scope.resolve(node).flat
    }
    const hasConfig = isConfigNode(node)
    const flattenedTypeNode = flattenTypeNode(hasConfig ? node.node : node, ctx)
    return hasConfig
        ? [
              [
                  "config",
                  {
                      config: entriesOf(node.config),
                      node: flattenedTypeNode
                  }
              ]
          ]
        : flattenedTypeNode
}

export const flattenTypeNode = (
    node: TypeNode,
    ctx: FlattenContext
): TraversalNode => {
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
    readonly [k in domain]: defined<TypeNode[domain]>
}

export const resolutionExtendsDomain = <domain extends Domain>(
    resolution: ResolvedNode,
    domain: domain
): resolution is DomainSubtypeResolution<domain> => {
    const domains = objectKeysOf(resolution)
    return domains.length === 1 && domains[0] === domain
}

export const toArrayNode = (node: Node): ResolvedNode => ({
    object: {
        class: Array,
        props: {
            [mappedKeys.index]: node
        }
    }
})
