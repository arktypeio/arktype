import type { ScopeRoot } from "../scope.js"
import { objectClassified } from "../utils/classify.js"
import type { Dictionary, keySet, mutable } from "../utils/generics.js"
import { hasKeys, keyCount } from "../utils/generics.js"
import { tryParseWellFormedNumber } from "../utils/numericLiterals.js"
import { checkNode } from "./check.js"
import type { PredicateContext } from "./compare.js"
import {
    composeKeyedOperation,
    composePredicateIntersection,
    equal
} from "./compose.js"
import { nodeIntersection } from "./intersection.js"
import type { ObjectConstraints, TypeTree, UnknownTypeNode } from "./node.js"

type UnknownProps = Dictionary<UnknownTypeNode>

// TODO: Never propagation
export const propsIntersection = composePredicateIntersection<
    UnknownProps,
    PredicateContext
>(
    composeKeyedOperation<UnknownProps, PredicateContext>(
        (propKey, l, r, context) => nodeIntersection(l, r, context.scope),
        { propagateEmpty: true }
    )
)

export const requiredKeysIntersection = composePredicateIntersection<keySet>(
    (l, r) => {
        const result = { ...l, ...r }
        const resultSize = keyCount(result)
        return resultSize === keyCount(l)
            ? resultSize === keyCount(r)
                ? equal
                : l
            : resultSize === keyCount(r)
            ? r
            : result
    }
)

export const checkObject = (
    data: object,
    constraints: ObjectConstraints,
    scope: ScopeRoot
) => {
    if (objectClassified(data, "Array") && isSimpleArray(constraints)) {
        return data.every((elementData) =>
            checkNode(elementData, constraints.propTypes.number, scope)
        )
    }
    const missingKeys: mutable<keySet> = { ...constraints.requiredKeys }
    for (const k in data) {
        const propValue = (data as Dictionary)[k]
        if (
            constraints.props?.[k] &&
            !checkNode(propValue, constraints.props[k], scope)
        ) {
            return false
        }
        if (constraints.propTypes) {
            const keyIsNumber = tryParseWellFormedNumber(k) !== undefined
            if (
                keyIsNumber &&
                constraints.propTypes.number &&
                !checkNode(propValue, constraints.propTypes.number, scope)
            ) {
                return false
            } else if (
                constraints.propTypes.string &&
                !checkNode(propValue, constraints.propTypes.string, scope)
            ) {
                return false
            }
        }
        delete missingKeys[k]
    }
    return hasKeys(missingKeys) ? false : true
}

const isSimpleArray = (
    constraints: ObjectConstraints
): constraints is { type: "object"; propTypes: { number: TypeTree } } =>
    !constraints.props &&
    constraints.propTypes?.number !== undefined &&
    Object.keys(constraints.propTypes).length === 1
