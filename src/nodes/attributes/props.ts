import type { ScopeRoot } from "../../scope.js"
import type { dict, keySet, mutable } from "../../utils/generics.js"
import { hasKeys } from "../../utils/generics.js"
import { tryParseWellFormedNumber } from "../../utils/numericLiterals.js"
import { hasObjectType } from "../../utils/typeOf.js"
import { checkNode } from "../check.js"
import type { KeyIntersection } from "../intersection.js"
import { intersection } from "../intersection.js"
import type { AttributesByType, Node } from "../node.js"

export type PropTypes = {
    readonly number?: Node
    readonly string?: Node
}

export const requiredKeysIntersection = {}

export const propsIntersection: KeyIntersection<dict<Node>> = (
    l,
    r,
    context,
    scope
) => {
    let lImpliesR = true
    let rImpliesL = true
    const result = { ...l, ...r }
    for (const k in result) {
        if (l[k]) {
            if (r[k]) {
                const propResult = intersection(l[k], r[k], scope)
                if (propResult === "never" && context.requiredKeys?.[k]) {
                    return null
                }
                if (propResult === true) {
                    result[k] = l[k]
                } else {
                    result[k] = propResult
                    lImpliesR &&= propResult === l
                    rImpliesL &&= propResult === r
                }
            } else {
                result[k] = l[k]
                rImpliesL = false
            }
        } else {
            result[k] = r[k]
            lImpliesR = false
        }
    }
    return lImpliesR ? (rImpliesL ? true : l) : rImpliesL ? r : result
}

export const checkChildren = (
    data: object,
    attributes: AttributesByType["object"],
    scope: ScopeRoot
) => {
    if (hasObjectType(data, "Array") && isSimpleArray(attributes)) {
        return data.every((elementData) =>
            checkNode(elementData, attributes.propTypes.number, scope)
        )
    }
    const missingKeys: mutable<keySet> = { ...attributes.requiredKeys }
    for (const k in data) {
        const propValue = (data as dict)[k]
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
    if (hasKeys(missingKeys)) {
        return false
    }
    return true
}

const isSimpleArray = (
    attributes: AttributesByType["object"]
): attributes is { propTypes: { number: Node } } =>
    !attributes.props &&
    !attributes.requiredKeys &&
    attributes.propTypes?.number !== undefined &&
    Object.keys(attributes.propTypes).length === 1
