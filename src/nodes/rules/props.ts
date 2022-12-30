import type { TraversalCheck } from "../../traverse/check.ts"
import { checkNode } from "../../traverse/check.ts"
import type { Dict } from "../../utils/generics.ts"
import {
    composeIntersection,
    composeKeyedOperation,
    empty,
    equal
} from "../compose.ts"
import { nodeIntersection } from "../intersection.ts"
import type { TraversalNode, TypeNode } from "../node.ts"
import { compileNode } from "../node.ts"
import type { PredicateContext } from "../predicate.ts"
import type { FlattenAndPushRule } from "./rules.ts"

export type PropsRule<aliases = Dict> = {
    [propKey in string]: Prop<aliases>
}

export type Prop<aliases = Dict> = TypeNode<aliases> | OptionalProp<aliases>

export type OptionalProp<aliases = Dict> = ["?", TypeNode<aliases>]

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

export const compileProps: FlattenAndPushRule<PropsRule> = (
    entries,
    props,
    scope
) => {
    const requiredProps: TraversalPropEntry[] = []
    const optionalProps: TraversalPropEntry[] = []
    for (const k in props) {
        const prop = props[k]
        if (isOptional(prop)) {
            optionalProps.push([k, compileNode(prop[1], scope)])
        } else {
            requiredProps.push([k, compileNode(prop, scope)])
        }
    }
    if (requiredProps.length) {
        entries.push(["requiredProps", requiredProps])
    }
    if (optionalProps.length) {
        entries.push(["optionalProps", optionalProps])
    }
}

const createPropChecker = <k extends "requiredProps" | "optionalProps">(k: k) =>
    ((state, props, scope) => {
        const rootData = state.data
        const rootNode = state.node
        for (const [propKey, propNode] of props as TraversalPropEntry[]) {
            if (k === "optionalProps" && !(propKey in state.data)) {
                continue
            }
            state.path.push(propKey)
            state.data = rootData[propKey] as any
            state.node = propNode
            checkNode(state, scope)
            state.path.pop()
        }
        state.data = rootData
        state.node = rootNode
    }) as TraversalCheck<k>

export const checkRequiredProps = createPropChecker("requiredProps")
export const checkOptionalProps = createPropChecker("optionalProps")

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
