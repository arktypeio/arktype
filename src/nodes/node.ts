import {
    compileDisjointReasonsMessage,
    writeDoubleMorphIntersectionMessage
} from "../parse/string/ast.ts"
import type { Morph } from "../parse/tuple/morph.ts"
import type { ScopeRoot } from "../scope.ts"
import type { Domain } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type {
    autocomplete,
    CollapsibleList,
    Dict,
    mutable,
    stringKeyOf
} from "../utils/generics.ts"
import { hasKey, hasKeys, keysOf } from "../utils/generics.ts"
import type {
    IntersectionContext,
    IntersectionResult,
    Intersector
} from "./compose.ts"
import {
    composeKeyedIntersection,
    disjoint,
    empty,
    isDisjoint,
    isEquality,
    throwUndefinedOperandsError
} from "./compose.ts"
import type { Keyword } from "./keywords.ts"
import type {
    ExactValueEntry,
    Predicate,
    TraversalPredicate
} from "./predicate.ts"
import {
    compilePredicate,
    predicateIntersection,
    predicateUnion
} from "./predicate.ts"
import {
    domainsOfNode,
    nodeIsMorph,
    resolveFlat,
    resolveIfIdentifier
} from "./resolve.ts"
import type { TraversalSubdomainRule } from "./rules/subdomain.ts"

export type TypeNode<$ = Dict> = Identifier<$> | TypeResolution<$>

/** If scope is provided, we also narrow each predicate to match its domain.
 * Otherwise, we use a base predicate for all types, which is easier to
 * manipulate.*/
export type TypeResolution<$ = Dict> = ValidatorNode<$> | MorphNode<$>

export type Identifier<$ = Dict> = string extends keyof $
    ? autocomplete<Keyword>
    : Keyword | stringKeyOf<$>

export type MorphNode<$ = Dict> = {
    readonly input: Identifier<$> | ValidatorNode<$>
    readonly morph: CollapsibleList<Morph>
}

export type ValidatorNode<$ = Dict> = {
    readonly [domain in Domain]?: Predicate<domain, $>
}

export type TraversalNode = ValidatorTraversalNode | [MorphTraversalEntry]

export type ValidatorTraversalNode =
    | Domain
    | SingleDomainTraversalNode
    | [MultiDomainEntry]
    | [CyclicReferenceEntry]

export type SingleDomainTraversalNode = readonly [
    ExplicitDomainEntry | ImplicitDomainEntry,
    ...TraversalPredicate
]

export type CyclicReferenceEntry = ["alias", string]

export type ExplicitDomainEntry = ["domain", Domain]

export type ImplicitDomainEntry =
    | ExactValueEntry
    | ["subdomain", TraversalSubdomainRule]

const hasImpliedDomain = (
    flatPredicate: TraversalPredicate | SingleDomainTraversalNode
): flatPredicate is SingleDomainTraversalNode =>
    flatPredicate[0] &&
    (flatPredicate[0][0] === "subdomain" || flatPredicate[0][0] === "value")

export type MultiDomainTraversalNode = [MultiDomainEntry]

export type MultiDomainEntry = ["domains", TraversalTypeSet]

export type MorphTraversalEntry = [
    "morph",
    {
        readonly input: ValidatorTraversalNode
        readonly morph: CollapsibleList<Morph>
    }
]

export type TraversalTypeSet = {
    readonly [domain in Domain]?: TraversalPredicate
}

export const compileNode = (node: TypeNode, $: ScopeRoot): TraversalNode => {
    if (typeof node === "string") {
        return resolveFlat(node, $)
    }
    if (nodeIsMorph(node)) {
        return [
            [
                "morph",
                {
                    input: compileNode(node.input, $) as ValidatorTraversalNode,
                    morph: node.morph
                }
            ]
        ]
    }
    const domains = keysOf(node)
    if (domains.length === 1) {
        const domain = domains[0]
        const predicate = node[domain]!
        if (predicate === true) {
            return domain
        }
        const flatPredicate = compilePredicate(domain, predicate, $)
        return hasImpliedDomain(flatPredicate)
            ? flatPredicate
            : [["domain", domain], ...flatPredicate]
    }
    const result: mutable<TraversalTypeSet> = {}
    for (const domain of domains) {
        result[domain] = compilePredicate(domain, node[domain]!, $)
    }
    return [["domains", result]]
}

export type ScopeNodes = { readonly [k in string]: TypeResolution }

export type CompiledScopeNodes<nodes extends ScopeNodes> = {
    readonly [k in keyof nodes]: TraversalNode
}

// TODO: separate all compile logic from nodes
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

export const nodeIntersection: Intersector<TypeNode> = (l, r, context) => {
    const lRoot = resolveIfIdentifier(l, context.$)
    const rRoot = resolveIfIdentifier(r, context.$)
    const result = nodeIsMorph(lRoot)
        ? nodeIsMorph(rRoot)
            ? throwParseError(writeDoubleMorphIntersectionMessage(context.path))
            : mixedIntersection(lRoot, rRoot, context)
        : nodeIsMorph(rRoot)
        ? mixedIntersection(rRoot, lRoot, context)
        : validatorIntersection(lRoot, rRoot, context)
    if (typeof result === "object" && !hasKeys(result)) {
        return context.disjoints[context.path]
            ? empty
            : disjoint(
                  "domain",
                  [
                      domainsOfNode(lRoot, context.$),
                      domainsOfNode(rRoot, context.$)
                  ],
                  context
              )
    }
    return result === lRoot ? l : result === rRoot ? r : result
}

const validatorIntersection = composeKeyedIntersection<ValidatorNode>(
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

const mixedIntersection = (
    morphNode: MorphNode,
    validator: ValidatorNode,
    context: IntersectionContext
): IntersectionResult<MorphNode> => {
    const result = nodeIntersection(
        morphNode.input,
        validator,
        context
    ) as IntersectionResult<ValidatorNode>
    return result === morphNode.input || isEquality(result)
        ? morphNode
        : isDisjoint(result)
        ? result
        : {
              input: result,
              morph: morphNode.morph
          }
}

export const initializeIntersectionContext = (
    $: ScopeRoot
): IntersectionContext => ({
    $,
    path: "",
    disjoints: {}
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
    const result = nodeIsMorph(lResolution)
        ? unionIncludingMorph(lResolution, rResolution, $)
        : nodeIsMorph(rResolution)
        ? unionIncludingMorph(rResolution, lResolution, $)
        : validatorUnion(lResolution, rResolution, $)
    return result
}

export const unionIncludingMorph = (
    morphNode: MorphNode,
    pairedNode: TypeResolution,
    $: ScopeRoot
) => morphNode

export const validatorUnion = (
    l: ValidatorNode,
    r: ValidatorNode,
    $: ScopeRoot
) => {
    const result = {} as mutable<ValidatorNode>
    const domains = keysOf({ ...l, ...r })
    for (const domain of domains) {
        result[domain] = hasKey(l, domain)
            ? hasKey(r, domain)
                ? predicateUnion(domain, l[domain], r[domain], $)
                : l[domain]
            : hasKey(r, domain)
            ? r[domain]
            : throwUndefinedOperandsError()
    }
    return result
}
