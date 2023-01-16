import { writeDoubleMorphIntersectionMessage } from "../parse/string/ast.ts"
import type { Morph } from "../parse/tuple/morph.ts"
import type { ScopeRoot } from "../scope.ts"
import type { Domain } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type {
    autocomplete,
    Dict,
    mutable,
    stringKeyOf
} from "../utils/generics.ts"
import { keysOf } from "../utils/generics.ts"
import type { SetOperation, SetOperationResult } from "./compose.ts"
import { composeKeyedOperation, empty, equal } from "./compose.ts"
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
import { resolveFlat, resolveRoot, rootIsMorph } from "./resolve.ts"
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
    readonly input: TypeNode<$>
    readonly morph: Morph
}

export type ValidatorNode<$ = Dict> = {
    readonly [domain in Domain]?: Predicate<domain, $>
}

export type TraversalNode =
    | Domain
    | SingleDomainTraversalNode
    | MultiDomainTraversalNode
    | CyclicReferenceNode
    | MorphTraversalNode

export type SingleDomainTraversalNode = readonly [
    ExplicitDomainEntry | ImplicitDomainEntry,
    ...TraversalPredicate
]

export type CyclicReferenceNode = [["alias", string]]

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

export type MorphTraversalNode = [
    [
        "morph",
        {
            readonly input: TraversalNode
            readonly morph: Morph
        }
    ]
]

export type TraversalTypeSet = {
    readonly [domain in Domain]?: TraversalPredicate
}

export const compileNode = (node: TypeNode, $: ScopeRoot): TraversalNode => {
    if (typeof node === "string") {
        return resolveFlat(node, $)
    }
    if (rootIsMorph(node)) {
        // TODO: chained?
        return [
            [
                "morph",
                {
                    input: compileNode(node.input, $),
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

export type MixedOperation = (
    morphNode: MorphNode,
    validator: ValidatorNode,
    $: ScopeRoot
) => SetOperationResult<MorphNode>

export const composeNodeOperation =
    (
        validatorOperation: SetOperation<ValidatorNode, ScopeRoot>,
        morphOperation: SetOperation<MorphNode, ScopeRoot>,
        mixedOperation: MixedOperation
    ): SetOperation<TypeNode, ScopeRoot> =>
    (l, r, $) => {
        const lRoot = resolveRoot(l, $)
        const rRoot = resolveRoot(r, $)
        const result = rootIsMorph(lRoot)
            ? rootIsMorph(rRoot)
                ? morphOperation(lRoot, rRoot, $)
                : mixedOperation(lRoot, rRoot, $)
            : rootIsMorph(rRoot)
            ? mixedOperation(rRoot, lRoot, $)
            : validatorOperation(lRoot, rRoot, $)
        return result === lRoot ? l : result === rRoot ? r : result
    }

export const finalizeNodeOperation = (
    l: TypeNode,
    result: SetOperationResult<TypeNode>
): TypeNode => (result === empty ? "never" : result === equal ? l : result)

const validatorIntersection = composeKeyedOperation<ValidatorNode, ScopeRoot>(
    (domain, l, r, $) => {
        if (l === undefined) {
            return r === undefined ? equal : undefined
        }
        if (r === undefined) {
            return undefined
        }
        return predicateIntersection(domain, l, r, $)
    },
    { onEmpty: "delete" }
)

export const nodeIntersection = composeNodeOperation(
    validatorIntersection,
    () => throwParseError(writeDoubleMorphIntersectionMessage([])),
    (morphNode, validatorNode, $) => {
        const input = nodeIntersection(morphNode.input, validatorNode, $)
        return input === morphNode.input || input === equal
            ? morphNode
            : input === empty
            ? empty
            : {
                  input,
                  morph: morphNode.morph
              }
    }
)

export const intersection = (l: TypeNode, r: TypeNode, $: ScopeRoot) =>
    finalizeNodeOperation(l, nodeIntersection(l, r, $))

export const union = (l: TypeNode, r: TypeNode, $: ScopeRoot) =>
    finalizeNodeOperation(l, nodeUnion(l, r, $))

export const validatorUnion = composeKeyedOperation<ValidatorNode, ScopeRoot>(
    (domain, l, r, scope) => {
        if (l === undefined) {
            return r === undefined ? equal : r
        }
        if (r === undefined) {
            return l
        }
        return predicateUnion(domain, l, r, scope)
    },
    { onEmpty: "throw" }
)

export const nodeUnion = composeNodeOperation(
    validatorUnion,
    () =>
        throwParseError(
            `An intersection must have at least one non-morph operand.`
        ),
    (morphNode, validatorNode, $) => {
        const input = nodeIntersection(morphNode.input, validatorNode, $)
        return input === morphNode.input || input === equal
            ? morphNode
            : input === empty
            ? empty
            : {
                  input,
                  morph: morphNode.morph
              }
    }
)
