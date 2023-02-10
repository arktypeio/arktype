import type { Dict } from "../../utils/generics.ts"
import { hasKey } from "../../utils/generics.ts"
import {
    composeIntersection,
    composeKeyedIntersection,
    equality,
    isDisjoint,
    isEquality
} from "../compose.ts"
import type { TraversalNode, TypeNode } from "../node.ts"
import { flattenNode, isLiteralNode, nodeIntersection } from "../node.ts"
import type { FlattenAndPushRule } from "./rules.ts"

export type PropsRule<$ = Dict> = {
    [propKey in string]: Prop<$>
}

export type Prop<$ = Dict> = TypeNode<$> | OptionalProp<$>

export type OptionalProp<$ = Dict> = ["?", TypeNode<$>]

export type PropEntry = RequiredPropEntry | OptionalPropEntry | IndexPropEntry

export type RequiredPropEntry = ["requiredProp", TraversalProp]

export type OptionalPropEntry = ["optionalProp", TraversalProp]

export type IndexPropEntry = ["indexProp", TraversalNode]

export type TraversalProp<
    key extends string = string,
    node extends TraversalNode = TraversalNode
> = [key, node]

export const isOptional = (prop: Prop): prop is OptionalProp =>
    (prop as OptionalProp)[0] === "?"

export const mappedPropKeys = {
    "[index]": true
} as const

export type MappedPropKey = keyof typeof mappedPropKeys

const nodeFrom = (prop: Prop) => (isOptional(prop) ? prop[1] : prop)

const getLengthIfPresent = (result: PropsRule) => {
    if (
        typeof result.length === "object" &&
        !isOptional(result.length) &&
        isLiteralNode(result.length, "number")
    ) {
        return result.length.number.value
    }
}

export const propsIntersection = composeIntersection<PropsRule>(
    (l, r, state) => {
        const result = propKeysIntersection(l, r, state)
        if (typeof result === "symbol") {
            return result
        }
        const lengthValue = getLengthIfPresent(result)
        if (lengthValue === undefined || !hasKey(result, "[index]")) {
            return result
        }
        // if we are at this point, we have an array with an exact length (i.e.
        // a tuple) and an index signature. Intersection each tuple item with
        // the index signature node and remove the index signature via a new
        // updated result, copied from result to avoid mutating existing references.
        const { "[index]": indexProp, ...updatedResult } = result
        const indexNode = nodeFrom(indexProp)
        for (let i = 0; i < lengthValue; i++) {
            if (!updatedResult[i]) {
                updatedResult[i] = indexNode
                continue
            }
            const existingNodeAtIndex = nodeFrom(updatedResult[i])
            state.path.push(`${i}`)
            const updatedResultAtIndex = nodeIntersection(
                existingNodeAtIndex,
                indexNode,
                state
            )
            state.path.pop()
            if (isDisjoint(updatedResultAtIndex)) {
                return updatedResultAtIndex
            } else if (
                !isEquality(updatedResultAtIndex) &&
                updatedResultAtIndex !== existingNodeAtIndex
            ) {
                updatedResult[i] = updatedResultAtIndex
            }
        }
        return updatedResult
    }
)

const propKeysIntersection = composeKeyedIntersection<PropsRule>(
    (propKey, l, r, context) => {
        if (l === undefined) {
            return r === undefined ? equality() : r
        }
        if (r === undefined) {
            return l
        }
        context.path.push(propKey)
        const result = nodeIntersection(nodeFrom(l), nodeFrom(r), context)
        context.path.pop()
        const resultIsOptional = isOptional(l) && isOptional(r)
        if (isDisjoint(result) && resultIsOptional) {
            // If an optional key has an empty intersection, the type can
            // still be satisfied as long as the key is not included. Set
            // the node to never rather than invalidating the type.
            return {}
        }
        return result
    },
    { onEmpty: "bubble" }
)

export const flattenProps: FlattenAndPushRule<PropsRule> = (
    entries,
    props,
    ctx
) => {
    for (const k in props) {
        const prop = props[k]
        ctx.path.push(k)
        if (k === "[index]") {
            // TODO: include an extra numeric props
            entries.push(["indexProp", flattenNode(nodeFrom(prop), ctx)])
        } else if (isOptional(prop)) {
            entries.push(["optionalProp", [k, flattenNode(prop[1], ctx)]])
        } else {
            entries.push(["requiredProp", [k, flattenNode(prop, ctx)]])
        }
        ctx.path.pop()
    }
}
