import type { ScopeRoot } from "../../scope.js"
import type { Dictionary } from "../../utils/generics.js"
import {
    composeIntersection,
    composeKeyedOperation,
    equal
} from "../compose.js"
import { nodeIntersection } from "../intersection.js"
import type { TypeNode } from "../node.js"
import type { PredicateContext } from "../predicate.js"

export type PropSet<scope extends Dictionary = Dictionary> = Dictionary<
    TypeNode<scope>
>

export type PropsAttribute<scope extends Dictionary = Dictionary> = {
    required?: PropSet<scope>
    optional?: PropSet<scope>
    mapped?: PropSet<scope>
}

export const propsAttributeIntersection = composeIntersection<
    PropsAttribute,
    PredicateContext
>((l, r, context) => {
    const lCompiled = requireOppositeKeys(l, r)
    const rCompiled = requireOppositeKeys(r, l)
    const result = rawPropsAttributeIntersection(
        lCompiled,
        rCompiled,
        context.scope
    )
    // If the two prop attributes appear equal, check to make sure neither had
    // required props the other was missing. All other cases are handled
    // correctly by default since requireOppositeKeys returns the original
    // reference if it doesn't need to modify its input.
    return result === equal && l === lCompiled && r === rCompiled
        ? equal
        : result
})

// If a key is optional on one side and required on the other, the result should
// be required. Returns props with the necessary changes if any, otherwise returns
// the original reference to props.
const requireOppositeKeys = (
    props: PropsAttribute,
    opposite: PropsAttribute
) => {
    if (!props.optional || !opposite.required) {
        return props
    }
    let modifiedProps
    for (const k in props.optional) {
        if (k in opposite.required) {
            modifiedProps ??= {
                ...props,
                required: { ...props.required },
                optional: { ...props.optional }
            }
            modifiedProps.required[k] = modifiedProps.optional[k]
            delete modifiedProps.optional[k]
        }
    }
    return modifiedProps ?? props
}

const composePropSetIntersection = (isRequired: boolean) =>
    composeIntersection<PropSet, ScopeRoot>(
        composeKeyedOperation<PropSet, ScopeRoot>(
            (propKey, l, r, scope) => nodeIntersection(l, r, scope),
            {
                onEmpty: isRequired ? "bubble" : "never"
            }
        )
    )

const rawPropsAttributeIntersection = composeKeyedOperation<
    PropsAttribute,
    ScopeRoot
>(
    {
        required: composePropSetIntersection(true),
        optional: composePropSetIntersection(false),
        mapped: composePropSetIntersection(false)
    },
    {
        onEmpty: "bubble"
    }
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
