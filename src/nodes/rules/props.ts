import type { Dict } from "../../utils/generics.ts"
import {
    composeIntersection,
    composeKeyedIntersection,
    equality,
    isDisjoint
} from "../compose.ts"
import type { TraversalNode, TypeNode } from "../node.ts"
import { flattenNode, nodeIntersection } from "../node.ts"
import type { FlattenAndPushRule } from "./rules.ts"

export type PropsRule<$ = Dict> = {
    [propKey in string]: Prop<$>
}

export type Prop<$ = Dict> = TypeNode<$> | OptionalProp<$>

export type OptionalProp<$ = Dict> = ["?", TypeNode<$>]

export type TraversalRequiredProps = [
    "requiredProps",
    readonly TraversalPropEntry[]
]

export type TraversalOptionalProps = [
    "optionalProps",
    readonly TraversalPropEntry[]
]

export type TraversalPropEntry = [propKey: string, node: TraversalNode]

export const isOptional = (prop: Prop): prop is OptionalProp =>
    (prop as OptionalProp)[0] === "?"

const nodeFrom = (prop: Prop) => (isOptional(prop) ? prop[1] : prop)

export const propsIntersection = composeIntersection<PropsRule>(
    composeKeyedIntersection<PropsRule>(
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
)

export const flattenProps: FlattenAndPushRule<PropsRule> = (
    entries,
    props,
    ctx
) => {
    const requiredProps: TraversalPropEntry[] = []
    const optionalProps: TraversalPropEntry[] = []
    for (const k in props) {
        const prop = props[k]
        ctx.path.push(k)
        if (isOptional(prop)) {
            optionalProps.push([k, flattenNode(prop[1], ctx)])
        } else {
            requiredProps.push([k, flattenNode(prop, ctx)])
        }
        ctx.path.pop()
    }
    if (requiredProps.length) {
        entries.push(["requiredProps", requiredProps])
    }
    if (optionalProps.length) {
        entries.push(["optionalProps", optionalProps])
    }
}
