import type { Type } from "../main.ts"
import type { ParseContext } from "../parse/definition.ts"
import { compileDisjointReasonsMessage } from "../parse/string/ast.ts"
import type { Domain } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type { Dict, mutable, stringKeyOf } from "../utils/generics.ts"
import { hasKey, hasKeys, keysOf } from "../utils/generics.ts"
import { Path } from "../utils/paths.ts"
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
import type { LiteralRules, MorphEntry, RuleEntry } from "./rules/rules.ts"

export type TypeNode<$ = Dict> = Identifier<$> | ResolvedNode<$>

export type Identifier<$ = Dict> = stringKeyOf<$>

/** If scope is provided, we also narrow each predicate to match its domain.
 * Otherwise, we use a base predicate for all types, which is easier to
 * manipulate.*/
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
                  keysOf(lResolution),
                  keysOf(rResolution)
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

export const intersection = (
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

export const union = (l: TypeNode, r: TypeNode, type: Type): ResolvedNode => {
    const lResolution = type.meta.scope.resolveNode(l)
    const rResolution = type.meta.scope.resolveNode(r)
    const result = {} as mutable<ResolvedNode>
    const domains = keysOf({ ...lResolution, ...rResolution })
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

export type TraversalEntry =
    | RuleEntry
    | MorphEntry
    | DomainsEntry
    | CyclicReferenceEntry
    | DomainEntry
    | BranchesEntry
    | SwitchEntry

export type TraversalKey = TraversalEntry[0]

export type TraversalRule<k extends TraversalKey> = Extract<
    TraversalEntry,
    [k, unknown]
>[1]

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

export type FlattenContext = ParseContext & {
    lastDomain: Domain
}

export const flattenType = (type: Type) => {
    const ctx: FlattenContext = {
        type,
        path: new Path(),
        lastDomain: "undefined"
    }
    return flattenNode(type.node, ctx)
}

export const flattenNode = (
    node: TypeNode,
    ctx: FlattenContext
): TraversalNode => {
    if (typeof node === "string") {
        return ctx.type.meta.scope.resolve(node).flat
    }
    const domains = keysOf(node)
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

export const isLiteralNode = <domain extends Domain>(
    node: ResolvedNode,
    domain: domain
): node is { [_ in domain]: LiteralRules<domain> } => {
    return (
        resolutionExtendsDomain(node, domain) &&
        isLiteralCondition(node[domain])
    )
}
