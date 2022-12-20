import type { TypeNode } from "../nodes/node.js"
import type { ScopeRoot } from "../scope.js"
import type { Domain } from "../utils/domains.js"

export const checkRules = (
    domain: Domain,
    data: unknown,
    attributes: unknown,
    scope: ScopeRoot
) => {
    return true
}

export const checkNode = (data: unknown, node: TypeNode, scope: ScopeRoot) => {
    return true
}

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
