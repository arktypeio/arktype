import type { Dict } from "../../utils/generics.ts"
import { hasKey, isKeyOf } from "../../utils/generics.ts"
import {
    composeIntersection,
    composeKeyedIntersection,
    equality,
    isDisjoint,
    isEquality
} from "../compose.ts"
import type { TraversalNode, TraversalValue, TypeNode } from "../node.ts"
import { flattenNode, isLiteralNode, nodeIntersection } from "../node.ts"
import type { FlattenAndPushRule } from "./rules.ts"

export type PropsRule<$ = Dict> = {
    [propKey in string]: Prop<$>
}

export type Prop<$ = Dict> = TypeNode<$> | OptionalProp<$>

export type OptionalProp<$ = Dict> = ["?", TypeNode<$>]

export type PropsEntry = [
    "props",
    {
        required?: TraversalProp[]
        optional?: TraversalProp[]
        mapped?: TraversalProp<MappedPropKey>[]
    }
]

export type TraversalProp<
    key extends string = string,
    node extends TraversalNode = TraversalNode
> = [key, node]

export const isOptional = (prop: Prop): prop is OptionalProp =>
    (prop as OptionalProp)[0] === "?"

export const mappedPropKeys = {
    "[number]": true
} as const

export type MappedPropKey = keyof typeof mappedPropKeys

const nodeFrom = (prop: Prop) => (isOptional(prop) ? prop[1] : prop)

export const propsIntersection = composeIntersection<PropsRule>(
    (l, r, state) => {
        const result = propKeysIntersection(l, r, state)
        if (isEquality(result) || isDisjoint(result)) {
            return result
        }
        // TODO: Maybe index instead?
        if (
            "[number]" in result &&
            "length" in result &&
            isLiteralNode(
                state.type.meta.scope.resolveNode(nodeFrom(result.length)),
                "number"
            )
        ) {
        }
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
    const result: TraversalValue<"props"> = {}
    for (const k in props) {
        const prop = props[k]
        ctx.path.push(k)
        if (isKeyOf(k, mappedPropKeys)) {
            result.mapped ??= []
            result.mapped.push([k, flattenNode(nodeFrom(prop), ctx)])
        } else if (isOptional(prop)) {
            result.optional ??= []
            result.optional.push([k, flattenNode(prop[1], ctx)])
        } else {
            result.required ??= []
            result.required.push([k, flattenNode(prop, ctx)])
        }
        ctx.path.pop()
    }
    entries.push(["props", result])
}
