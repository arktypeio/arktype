import type { Dict } from "../../utils/generics.js"
import {
    composeIntersection,
    composeKeyedOperation,
    empty,
    equal
} from "../compose.js"
import { nodeIntersection } from "../intersection.js"
import type { FlatNode, TypeNode } from "../node.js"
import type { PredicateContext } from "../predicate.js"

export type PropsRule<scope extends Dict = Dict> = {
    [propKey in string]: Prop<scope>
}

export type Prop<scope extends Dict = Dict> =
    | TypeNode<scope>
    | OptionalProp<scope>

export type OptionalProp<scope extends Dict = Dict> = ["?", TypeNode<scope>]

export type FlatPropsRules = {
    "props/required": FlatPropEntries
    "props/optional": FlatPropEntries
    "props/mapped": MappedPropsRuleValue
}

export type MappedPropsRuleValue = [
    mappedEntries: MappedFlatPropEntries,
    namedProps?: {
        readonly required?: FlatPropSet
        readonly optional?: FlatPropSet
    }
]

export type MappedFlatPropEntries = readonly [
    ifKeySatisfies: FlatNode,
    // Once we allow mapping based on key value, add: ((key: string) => FlatNode)
    thenCheckValueAgainst: FlatNode
]

export type FlatPropEntries = readonly [propKey: string, flatNode: FlatNode][]

export type FlatPropSet = { readonly [propKey in string]: FlatNode }

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

// import type { ScopeRoot } from "../../scope.js"
// import type { Dict } from "../../utils/generics.js"
// import {
//     composeIntersection,
//     composeKeyedOperation,
//     empty,
//     equal
// } from "../compose.js"
// import { nodeIntersection } from "../intersection.js"
// import type { FlatNode, TypeNode } from "../node.js"
// import type { PredicateContext } from "../predicate.js"

// export type PropsRules<scope extends Dict = Dict> = {
//     readonly required?: PropSet<scope>
//     readonly optional?: PropSet<scope>
//     readonly mapped?: PropSet<scope>
// }

// export type PropSet<scope extends Dict = Dict> = {
//     readonly [propKey in string]: TypeNode<scope>
// }

// export const propsIntersection = composeIntersection<
//     PropsRules,
//     PredicateContext
// >((l, r, context) => {
//     const lCompiled = requireOppositeKeys(l, r)
//     const rCompiled = requireOppositeKeys(r, l)
//     const result = rawPropsIntersection(lCompiled, rCompiled, context.scope)
//     // If the two prop attributes appear equal, check to make sure neither had
//     // required props the other was missing. All other cases are handled
//     // correctly by default since requireOppositeKeys returns the original
//     // reference if it doesn't need to modify its input.
//     return result === equal && l === lCompiled && r === rCompiled
//         ? equal
//         : result
// })

// // If a key is optional on one side and required on the other, the result should
// // be required. Returns props with the necessary changes if any, otherwise returns
// // the original reference to props.
// const requireOppositeKeys = (props: PropsRules, opposite: PropsRules) => {
//     if (!props.optional || !opposite.required) {
//         return props
//     }
//     let modifiedProps
//     for (const k in props.optional) {
//         if (k in opposite.required) {
//             modifiedProps ??= {
//                 ...props,
//                 required: { ...props.required },
//                 optional: { ...props.optional }
//             }
//             modifiedProps.required[k] = modifiedProps.optional[k]
//             delete modifiedProps.optional[k]
//         }
//     }
//     return modifiedProps ?? props
// }

// const composePropSetIntersection = (isRequiredName: boolean) =>
//     composeIntersection<PropSet, ScopeRoot>(
//         composeKeyedOperation<PropSet, ScopeRoot>(
//             (propKey, l, r, scope) => {
//                 if (l === undefined) {
//                     return r === undefined ? equal : r
//                 }
//                 if (r === undefined) {
//                     return l
//                 }
//                 const result = nodeIntersection(l, r, scope)
//                 if (result === empty && !isRequiredName) {
//                     // If an optional or mapped key has an empty intersection, the
//                     // type can still be satisfied as long as the key is not included.
//                     // Set the node to "never" rather than invalidating the type.
//                     return "never"
//                 }
//                 return result
//             },
//             {
//                 onEmpty: "bubble"
//             }
//         )
//     )

// const rawPropsIntersection = composeKeyedOperation<PropsRules, ScopeRoot>(
//     {
//         required: composePropSetIntersection(true),
//         optional: composePropSetIntersection(false),
//         mapped: composePropSetIntersection(false)
//     },
//     {
//         onEmpty: "bubble"
//     }
// )
