import type { ScopeRoot } from "../scope.js"
import type { Dictionary, keySet, mutable } from "../utils/generics.js"
import { hasKeys, keyCount } from "../utils/generics.js"
import { tryParseWellFormedNumber } from "../utils/numericLiterals.js"
import type { ObjectTypeName } from "../utils/typeOf.js"
import { hasObjectType } from "../utils/typeOf.js"
import type { Bounds } from "./bounds.js"
import { boundsIntersection } from "./bounds.js"
import { checkNode } from "./check.js"
import type { IntersectionReducer } from "./intersection.js"
import { composeKeyedIntersection, intersection } from "./intersection.js"
import type { Node } from "./node.js"

type PropTypesAttribute = {
    readonly number?: Node
    readonly string?: Node
}

export type ObjectAttributes = {
    readonly type: "object"
    readonly props?: Dictionary<Node>
    readonly requiredKeys?: keySet
    readonly propTypes?: PropTypesAttribute
    readonly subtype?: ObjectTypeName
    readonly bounds?: Bounds
}

export const objectIntersection: IntersectionReducer<ObjectAttributes> = (
    l,
    r,
    scope
) => {
    const result = rawObjectIntersection(l, r, scope)
    if (result?.requiredKeys) {
        for (const k in result.requiredKeys) {
            // TODO: Check never propagation
            if (result.props?.[k] === "never") {
                return null
            }
        }
    }
    return result
}

export const propsIntersection =
    composeKeyedIntersection<Dictionary<Node>>(intersection)

export const requiredKeysIntersection: IntersectionReducer<keySet> = (l, r) => {
    const result = { ...l, ...r }
    const resultSize = keyCount(result)
    return resultSize === keyCount(l)
        ? resultSize === keyCount(r)
            ? undefined
            : l
        : resultSize === keyCount(r)
        ? r
        : result
}

const rawObjectIntersection = composeKeyedIntersection<ObjectAttributes>({
    subtype: (l, r) => (l === r ? undefined : null),
    props: propsIntersection,
    propTypes: propsIntersection,
    bounds: boundsIntersection,
    requiredKeys: requiredKeysIntersection
})

export const checkObject = (
    data: object,
    attributes: ObjectAttributes,
    scope: ScopeRoot
) => {
    if (hasObjectType(data, "Array") && isSimpleArray(attributes)) {
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
    children: ObjectAttributes
): children is { propTypes: { number: Node } } =>
    !children.props &&
    children.propTypes?.number !== undefined &&
    Object.keys(children.propTypes).length === 1
