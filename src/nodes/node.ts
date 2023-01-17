import { writeDoubleMorphIntersectionMessage } from "../parse/string/ast.ts"
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
import { keysOf } from "../utils/generics.ts"
import type {
    OperationContext,
    SetOperation,
    SetOperationResult
} from "./compose.ts"
import {
    composeKeyedOperation,
    equality,
    Equality,
    isDisjoint,
    isEquality
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
import { nodeIsMorph, resolveFlat, resolveIfIdentifier } from "./resolve.ts"
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

export type TraversalNode = ValidatorTraversalNode | MorphTraversalNode

export type ValidatorTraversalNode =
    | Domain
    | SingleDomainTraversalNode
    | MultiDomainTraversalNode
    | CyclicReferenceNode

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
            readonly input: ValidatorTraversalNode
            readonly morph: CollapsibleList<Morph>
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
    context: OperationContext
) => SetOperationResult<MorphNode>

export const composeNodeOperation =
    (
        validatorOperation: SetOperation<ValidatorNode>,
        morphOperation: SetOperation<MorphNode>,
        mixedOperation: MixedOperation
    ): SetOperation<TypeNode> =>
    (l, r, context) => {
        const lRoot = resolveIfIdentifier(l, context.$)
        const rRoot = resolveIfIdentifier(r, context.$)
        const result = nodeIsMorph(lRoot)
            ? nodeIsMorph(rRoot)
                ? morphOperation(lRoot, rRoot, context)
                : mixedOperation(lRoot, rRoot, context)
            : nodeIsMorph(rRoot)
            ? mixedOperation(rRoot, lRoot, context)
            : validatorOperation(lRoot, rRoot, context)
        return result === lRoot ? l : result === rRoot ? r : result
    }

export const finalizeNodeOperation = (
    l: TypeNode,
    result: SetOperationResult<TypeNode>
): TypeNode => (isDisjoint(result) ? "never" : isEquality(result) ? l : result)

const validatorIntersection = composeKeyedOperation<ValidatorNode>(
    (domain, l, r, context) => {
        if (l === undefined) {
            return r === undefined ? equality() : undefined
        }
        if (r === undefined) {
            return undefined
        }
        return predicateIntersection(domain, l, r, context)
    },
    { onEmpty: "delete" }
)

export const nodeIntersection = composeNodeOperation(
    validatorIntersection,
    () => throwParseError(writeDoubleMorphIntersectionMessage([])),
    (morphNode, validatorNode, context) => {
        const result = nodeIntersection(
            morphNode.input,
            validatorNode,
            context
        ) as SetOperationResult<ValidatorNode>
        return result === morphNode.input || isEquality(result)
            ? morphNode
            : isDisjoint(result)
            ? result
            : {
                  input: result,
                  morph: morphNode.morph
              }
    }
)

const initializeOperationContext = ($: ScopeRoot): OperationContext => ({
    $,
    path: "",
    emptyResults: {},
    domain: null
})

export const intersection = (l: TypeNode, r: TypeNode, $: ScopeRoot) =>
    finalizeNodeOperation(
        l,
        nodeIntersection(l, r, initializeOperationContext($))
    )

export const union = (l: TypeNode, r: TypeNode, $: ScopeRoot) =>
    finalizeNodeOperation(l, nodeUnion(l, r, initializeOperationContext($)))

export const validatorUnion = composeKeyedOperation<ValidatorNode>(
    (domain, l, r, context) => {
        if (l === undefined) {
            return r === undefined ? equality() : r
        }
        if (r === undefined) {
            return l
        }
        return predicateUnion(domain, l, r, context)
    },
    { onEmpty: "throw" }
)

export const nodeUnion = composeNodeOperation(
    validatorUnion,
    () => throwParseError(writeDoubleMorphIntersectionMessage([])),
    (morphNode, validatorNode, $) => {
        return nodeUnion(morphNode.input, validatorNode, $) as any
    }
)
