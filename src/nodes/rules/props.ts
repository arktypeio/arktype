import type { Dict } from "../../utils/generics.ts"
import {
    composeIntersection,
    composeKeyedIntersection,
    equality,
    isDisjoint
} from "../compose.ts"
import type { TraversalNode, TraversalValue, TypeNode } from "../node.ts"
import { flattenNode, nodeIntersection } from "../node.ts"
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
        mapped?: TraversalProp[]
    }
]

export type TraversalProps = {}

export type TraversalProp = [propKey: string, node: TraversalNode]

export const isOptional = (prop: Prop): prop is OptionalProp =>
    (prop as OptionalProp)[0] === "?"

export const mappedPropKeys = {
    "[number]": true
} as const

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
    const required: TraversalProp[] = []
    const optional: TraversalProp[] = []
    const mapped: TraversalProp[] = []
    for (const k in props) {
        const prop = props[k]
        ctx.path.push(k)
        if (k in mappedPropKeys) {
            mapped.push([k, flattenNode(nodeFrom(prop), ctx)])
        } else if (isOptional(prop)) {
            optional.push([k, flattenNode(prop[1], ctx)])
        } else {
            required.push([k, flattenNode(prop, ctx)])
        }
        ctx.path.pop()
    }
    const result: TraversalValue<"props"> = {}
    if (required.length) {
        result.required = required
    }
    if (optional.length) {
        result.optional = optional
    }
    if (mapped.length) {
        result.mapped = mapped
    }
    return result
}
