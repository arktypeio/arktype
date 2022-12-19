import type { Dict } from "../../utils/generics.js"
import {
    composeIntersection,
    composeKeyedOperation,
    empty,
    equal
} from "../compose.js"
import { nodeIntersection } from "../intersection.js"
import type { TypeNode } from "../node.js"
import type { PredicateContext } from "../predicate.js"

export type PropSet<scope extends Dict = Dict> = {
    readonly [propKey in string]: Prop<scope>
}

export type Prop<scope extends Dict = Dict> =
    | TypeNode<scope>
    | OptionalProp<scope>

export type OptionalProp<scope extends Dict = Dict> = ["?", TypeNode<scope>]

const isOptional = (prop: Prop): prop is OptionalProp =>
    (prop as OptionalProp)[0] === "?"

const nodeFrom = (prop: Prop) => (isOptional(prop) ? prop[1] : prop)

const mappedKeyRegex = /^\[.*\]$/

const isMappedKey = (propKey: string) => mappedKeyRegex.test(propKey)

export const propsIntersection = composeIntersection<PropSet, PredicateContext>(
    composeKeyedOperation<PropSet, PredicateContext>(
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

// export const requiredKeysIntersection = composeIntersection<keySet>((l, r) => {
//     const result = { ...l, ...r }
//     const resultSize = keyCount(result)
//     return resultSize === keyCount(l)
//         ? resultSize === keyCount(r)
//             ? equal
//             : l
//         : resultSize === keyCount(r)
//         ? r
//         : result
// })

// export const checkObject = (
//     data: object,
//     rules: RuleSet<"object", Dictionary>,
//     scope: ScopeRoot
// ) => {
//     if (hasKind(data, "Array") && isSimpleArray(rules)) {
//         return data.every((elementData) =>
//             checkNode(elementData, rules.propTypes.number, scope)
//         )
//     }
//     const missingKeys: mutable<keySet> = { ...rules.requiredKeys }
//     for (const k in data) {
//         const propValue = (data as Dictionary)[k]
//         if (rules.props?.[k] && !checkNode(propValue, rules.props[k], scope)) {
//             return false
//         }
//         if (rules.propTypes) {
//             const keyIsNumber = tryParseWellFormedNumber(k) !== undefined
//             if (
//                 keyIsNumber &&
//                 rules.propTypes.number &&
//                 !checkNode(propValue, rules.propTypes.number, scope)
//             ) {
//                 return false
//             } else if (
//                 rules.propTypes.string &&
//                 !checkNode(propValue, rules.propTypes.string, scope)
//             ) {
//                 return false
//             }
//         }
//         delete missingKeys[k]
//     }
//     return hasKeys(missingKeys) ? false : true
// }

// const isSimpleArray = (
//     rules: RuleSet<"object", Dictionary>
// ): rules is { type: "object"; propTypes: { number: TypeNode } } =>
//     !rules.props &&
//     rules.propTypes?.number !== undefined &&
//     Object.keys(rules.propTypes).length === 1
