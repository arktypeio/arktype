import type { Scope } from "../main.ts"
import type { ParseContext } from "../parse/definition.ts"
import { compileDisjointReasonsMessage } from "../parse/string/ast.ts"
import type { Domain } from "../utils/domains.ts"
import { hasSubdomain } from "../utils/domains.ts"
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
import type { Branch, Predicate } from "./predicate.ts"
import {
    flattenPredicate,
    isLiteralCondition,
    predicateIntersection,
    predicateUnion,
    resolutionExtendsDomain
} from "./predicate.ts"
import { isOptional } from "./rules/props.ts"
import type { LiteralRules, MorphEntry, RuleEntry } from "./rules/rules.ts"

// TODO: should Type be allowed as a node? would allow configs etc. during traversal
export type TypeNode<$ = Dict> = Identifier<$> | ResolvedNode<$>

/** If scope is provided, we also narrow each predicate to match its domain.
 * Otherwise, we use a base predicate for all types, which is easier to
 * manipulate.*/
export type ResolvedNode<$ = Dict> = {
    readonly [domain in Domain]?: Predicate<domain, $>
}

export type Identifier<$ = Dict> = stringKeyOf<$>

export const nodeIntersection: Intersector<TypeNode> = (l, r, state) => {
    const lResolution = state.ctx.$.resolveNode(l)
    const rResolution = state.ctx.$.resolveNode(r)
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

/** Reflects that an Idenitifier cannot be the result of any intersection
 * including a TypeResolution  */
type IntersectionResult<
    l extends TypeNode,
    r extends TypeNode
> = l extends ResolvedNode
    ? ResolvedNode
    : r extends ResolvedNode
    ? ResolvedNode
    : TypeNode

export const intersection = <l extends TypeNode, r extends TypeNode>(
    l: l,
    r: r,
    ctx: ParseContext
) => {
    const state = new IntersectionState(ctx)
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
    l: TypeNode,
    r: TypeNode,
    ctx: ParseContext
): ResolvedNode => {
    const lResolution = ctx.$.resolveNode(l)
    const rResolution = ctx.$.resolveNode(r)
    const result = {} as mutable<ResolvedNode>
    const domains = keysOf({ ...lResolution, ...rResolution })
    for (const domain of domains) {
        result[domain] = hasKey(lResolution, domain)
            ? hasKey(rResolution, domain)
                ? predicateUnion(
                      domain,
                      lResolution[domain],
                      rResolution[domain],
                      ctx
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

export const flattenNode = (
    node: TypeNode,
    ctx: ParseContext
): TraversalNode => {
    if (typeof node === "string") {
        return ctx.$.resolve(node).flat
    }
    const domains = keysOf(node)
    if (domains.length === 1) {
        const domain = domains[0]
        const predicate = node[domain]!
        if (predicate === true) {
            return domain
        }
        const flatPredicate = flattenPredicate(predicate, ctx)
        return hasImpliedDomain(flatPredicate)
            ? flatPredicate
            : [["domain", domain], ...flatPredicate]
    }
    const result: mutable<DomainsEntry[1]> = {}
    for (const domain of domains) {
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

export const nodeIncludesMorph = (node: TypeNode, $: Scope): boolean =>
    typeof node === "string"
        ? $.resolve(node).includesMorph
        : Object.values(node).some((predicate) =>
              predicate === true
                  ? false
                  : hasSubdomain(predicate, "Array")
                  ? predicate.some((branch) => branchIncludesMorph(branch, $))
                  : branchIncludesMorph(predicate, $)
          )

export const branchIncludesMorph = (branch: Branch, $: Scope) =>
    "morph" in branch
        ? true
        : "props" in branch
        ? Object.values(branch.props!).some((prop) =>
              nodeIncludesMorph(isOptional(prop) ? prop[1] : prop, $)
          )
        : false
