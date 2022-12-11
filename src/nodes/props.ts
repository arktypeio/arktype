import type { ScopeRoot } from "../scope.js"
import type { Dictionary, keySet, mutable } from "../utils/generics.js"
import { hasKeys, keyCount } from "../utils/generics.js"
import { tryParseWellFormedNumber } from "../utils/numericLiterals.js"
import type { ObjectSubtypeName } from "../utils/typeOf.js"
import { hasObjectSubtype } from "../utils/typeOf.js"
import type { Bounds } from "./bounds.js"
import { checkNode } from "./check.js"
import type { ConstraintContext } from "./compare.js"
import { nodeIntersection } from "./intersection.js"
import type { BaseNode, Resolution } from "./node.js"
import type { SetOperation } from "./operation.js"
import { composeConstraintOperation, equivalence } from "./operation.js"

type PropTypesAttribute = {
    readonly number?: Resolution
    readonly string?: Resolution
}

export type ObjectAttributes = {
    readonly type: "object"
    readonly props?: Dictionary<Resolution>
    readonly requiredKeys?: keySet
    readonly propTypes?: PropTypesAttribute
    readonly subtype?: ObjectSubtypeName
    readonly bounds?: Bounds
}

// TODO: Never propagation
export const propsIntersection = composeConstraintOperation<
    Dictionary<BaseNode>
>((propKey, l, r, context) => nodeIntersection(l, r, context.scope))

export const requiredKeysIntersection: SetOperation<keySet> = (l, r) => {
    const result = { ...l, ...r }
    const resultSize = keyCount(result)
    return resultSize === keyCount(l)
        ? resultSize === keyCount(r)
            ? equivalence
            : l
        : resultSize === keyCount(r)
        ? r
        : result
}

export const checkObject = (
    data: object,
    attributes: ObjectAttributes,
    scope: ScopeRoot
) => {
    if (hasObjectSubtype(data, "Array") && isSimpleArray(attributes)) {
        return data.every((elementData) =>
            checkNode(elementData, attributes.propTypes.number, scope)
        )
    }
    const missingKeys: mutable<keySet> = { ...attributes.requiredKeys }
    for (const k in data) {
        const propValue = (data as Dictionary)[k]
        if (
            attributes.props?.[k] &&
            !checkNode(propValue, attributes.props[k], scope)
        ) {
            return false
        }
        if (attributes.propTypes) {
            const keyIsNumber = tryParseWellFormedNumber(k) !== undefined
            if (
                keyIsNumber &&
                attributes.propTypes.number &&
                !checkNode(propValue, attributes.propTypes.number, scope)
            ) {
                return false
            } else if (
                attributes.propTypes.string &&
                !checkNode(propValue, attributes.propTypes.string, scope)
            ) {
                return false
            }
        }
        delete missingKeys[k]
    }
    return hasKeys(missingKeys) ? false : true
}

const isSimpleArray = (
    attributes: ObjectAttributes
): attributes is { type: "object"; propTypes: { number: Resolution } } =>
    !attributes.props &&
    attributes.propTypes?.number !== undefined &&
    Object.keys(attributes.propTypes).length === 1
