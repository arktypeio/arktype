import type { Dict } from "../../utils/generics.js"
import {
    composeIntersection,
    composeKeyedOperation,
    empty,
    equal
} from "../compose.js"
import { nodeIntersection } from "../intersection.js"
import type { TraversalNode, TypeNode } from "../node.js"
import { flattenNode } from "../node.js"
import type { PredicateContext } from "../predicate.js"
import type { FlattenAndPushRule } from "./rules.js"

export type PropsRule<scope extends Dict = Dict> = {
    [propKey in string]: Prop<scope>
}

export type Prop<scope extends Dict = Dict> =
    | TypeNode<scope>
    | OptionalProp<scope>

export type OptionalProp<scope extends Dict = Dict> = ["?", TypeNode<scope>]

export type TraversalRequiredProps = [
    "requiredProps",
    readonly TraversalPropEntry[]
]

export type TraversalOptionalProps = [
    "optionalProps",
    readonly TraversalPropEntry[]
]

export type TraversalPropEntry = [propKey: string, flatNode: TraversalNode]

const isOptional = (prop: Prop): prop is OptionalProp =>
    (prop as OptionalProp)[0] === "?"

const nodeFrom = (prop: Prop) => (isOptional(prop) ? prop[1] : prop)

const mappedKeyRegex = /^\[.*\]$/

const isMappedKey = (propKey: string) => mappedKeyRegex.test(propKey)

export const propsIntersection = composeIntersection<
    PropsRule,
    PredicateContext
>(
    composeKeyedOperation<PropsRule, PredicateContext>(
        (propKey, l, r, context) => {
            if (l === undefined) {
                return r === undefined ? equal : r
            }
            if (r === undefined) {
                return l
            }
            const result = nodeIntersection(
                nodeFrom(l),
                nodeFrom(r),
                context.scope
            )
            const resultIsOptional = isOptional(l) && isOptional(r)
            if (
                result === empty &&
                (resultIsOptional || isMappedKey(propKey))
            ) {
                // If an optional or mapped key has an empty intersection, the
                // type can still be satisfied as long as the key is not included.
                // Set the node to "never" rather than invalidating the type.
                return "never"
            }
            return result
        },
        {
            onEmpty: "bubble"
        }
    )
)

export const flattenProps: FlattenAndPushRule<PropsRule> = (
    entries,
    props,
    scope
) => {
    const requiredProps: TraversalPropEntry[] = []
    const optionalProps: TraversalPropEntry[] = []
    for (const k in props) {
        const prop = props[k]
        if (isOptional(prop)) {
            optionalProps.push([k, flattenNode(prop[1], scope)])
        } else {
            requiredProps.push([k, flattenNode(prop, scope)])
        }
    }
    if (requiredProps.length) {
        entries.push(["requiredProps", requiredProps])
    }
    if (optionalProps.length) {
        entries.push(["optionalProps", optionalProps])
    }
}

// export type TraversalMappedPropsRule = [
//     mappedEntries: readonly TraversalMappedPropEntry[],
//     namedProps?: {
//         readonly required?: TraversalPropSet
//         readonly optional?: TraversalPropSet
//     }
// ]

// export type TraversalMappedPropEntry = [
//     ifKeySatisfies: TraversalNode,
//     thenCheckValueAgainst: TraversalNode | ((key: string) => TraversalNode)
// ]

// export type TraversalPropSet = { readonly [propKey in string]: TraversalNode }
