import type { KeyCheckKind } from "../../scopes/type.js"
import type { Dict } from "../../utils/generics.js"
import {
    composeIntersection,
    composeKeyedIntersection,
    equality,
    isDisjoint,
    isEquality
} from "../compose.js"
import type {
    FlattenContext,
    Node,
    TraversalEntry,
    TraversalNode
} from "../node.js"
import { flattenNode, isLiteralNode, nodeIntersection } from "../node.js"
import type { FlattenAndPushRule } from "./rules.js"

export type PropsRule<$ = Dict> = {
    [propKey in string]: Prop<$>
}

export type Prop<$ = Dict, node extends Node<$> = Node<$>> =
    | node
    | OptionalProp<$, node>
    | PrerequisiteProp<$, node>

export type OptionalProp<$ = Dict, node extends Node<$> = Node<$>> = ["?", node]

export type PrerequisiteProp<$ = Dict, node extends Node<$> = Node<$>> = [
    "!",
    node
]

export type PropsRecordKey = "distilledProps" | "strictProps"

export type PropsRecordEntry<kind extends PropsRecordKey = PropsRecordKey> = [
    kind,
    {
        required: { [propKey in string]: TraversalNode }
        optional: { [propKey in string]: TraversalNode }
        index?: TraversalNode
    }
]

export type DistilledPropsEntry = PropsRecordEntry<"distilledProps">

export type StrictPropsEntry = PropsRecordEntry<"strictProps">

export type PropEntry =
    | RequiredPropEntry
    | OptionalPropEntry
    | IndexPropEntry
    | PrerequisitePropEntry

export type PrerequisitePropEntry = ["prerequisiteProp", TraversalProp]

export type RequiredPropEntry = ["requiredProp", TraversalProp]

export type OptionalPropEntry = ["optionalProp", TraversalProp]

export type IndexPropEntry = ["indexProp", TraversalNode]

export type TraversalProp<
    key extends string = string,
    node extends TraversalNode = TraversalNode
> = [key, node]

export const isOptional = (prop: Prop): prop is OptionalProp =>
    (prop as OptionalProp)[0] === "?"

export const isPrerequisite = (prop: Prop): prop is PrerequisiteProp =>
    (prop as PrerequisiteProp)[0] === "!"

export const mappedKeys = {
    index: "[index]"
} as const

export type MappedKeys = typeof mappedKeys

export type MappedPropKey = MappedKeys[keyof MappedKeys]

export const propToNode = (prop: Prop) =>
    isOptional(prop) || isPrerequisite(prop) ? prop[1] : prop

const getTupleLengthIfPresent = (result: PropsRule) => {
    if (
        typeof result.length === "object" &&
        isPrerequisite(result.length) &&
        typeof result.length[1] !== "string" &&
        isLiteralNode(result.length[1], "number")
    ) {
        return result.length[1].number.value
    }
}

export const propsIntersection = composeIntersection<PropsRule>(
    (l, r, state) => {
        const result = propKeysIntersection(l, r, state)
        if (typeof result === "symbol") {
            return result
        }
        const lengthValue = getTupleLengthIfPresent(result)
        if (lengthValue === undefined || !(mappedKeys.index in result)) {
            return result
        }
        // if we are at this point, we have an array with an exact length (i.e.
        // a tuple) and an index signature. Intersection each tuple item with
        // the index signature node and remove the index signature via a new
        // updated result, copied from result to avoid mutating existing references.
        const { [mappedKeys.index]: indexProp, ...updatedResult } = result
        const indexNode = propToNode(indexProp)
        for (let i = 0; i < lengthValue; i++) {
            if (!updatedResult[i]) {
                updatedResult[i] = indexNode
                continue
            }
            const existingNodeAtIndex = propToNode(updatedResult[i])
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
        const result = nodeIntersection(propToNode(l), propToNode(r), context)
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
    const keyConfig = ctx.type.config?.keys ?? ctx.type.scope.config.keys
    return keyConfig === "loose"
        ? flattenLooseProps(entries, props, ctx)
        : flattenPropsRecord(keyConfig, entries, props, ctx)
}

const flattenLooseProps: FlattenAndPushRule<PropsRule> = (
    entries,
    props,
    ctx
) => {
    // if we don't care about extraneous keys, flatten props so we can iterate over the definitions directly
    for (const k in props) {
        const prop = props[k]
        ctx.path.push(k)
        if (k === mappedKeys.index) {
            entries.push(["indexProp", flattenNode(propToNode(prop), ctx)])
        } else if (isOptional(prop)) {
            entries.push(["optionalProp", [k, flattenNode(prop[1], ctx)]])
        } else if (isPrerequisite(prop)) {
            entries.push(["prerequisiteProp", [k, flattenNode(prop[1], ctx)]])
        } else {
            entries.push(["requiredProp", [k, flattenNode(prop, ctx)]])
        }
        ctx.path.pop()
    }
}

const flattenPropsRecord = (
    kind: Exclude<KeyCheckKind, "loose">,
    entries: TraversalEntry[],
    props: PropsRule,
    ctx: FlattenContext
) => {
    const result: PropsRecordEntry[1] = {
        required: {},
        optional: {}
    }
    // if we need to keep track of extraneous keys, either to add problems or
    // remove them, store the props as a Record to optimize for presence
    // checking as we iterate over the data
    for (const k in props) {
        const prop = props[k]
        ctx.path.push(k)
        if (k === mappedKeys.index) {
            result.index = flattenNode(propToNode(prop), ctx)
        } else if (isOptional(prop)) {
            result.optional[k] = flattenNode(prop[1], ctx)
        } else if (isPrerequisite(prop)) {
            // we still have to push prerequisite props as normal entries so they can be checked first
            entries.push(["prerequisiteProp", [k, flattenNode(prop[1], ctx)]])
        } else {
            result.required[k] = flattenNode(prop, ctx)
        }
        ctx.path.pop()
    }
    entries.push([`${kind}Props`, result])
}
