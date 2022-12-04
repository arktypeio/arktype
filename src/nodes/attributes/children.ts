import type { ScopeRoot } from "../../scope.js"
import type { keySet, mutable } from "../../utils/generics.js"
import { hasKeys } from "../../utils/generics.js"
import { tryParseWellFormedNumber } from "../../utils/numericLiterals.js"
import type { dict } from "../../utils/typeOf.js"
import { hasObjectSubtype } from "../../utils/typeOf.js"
import { checkNode } from "../check.js"
import type { KeyIntersection } from "../intersection.js"
import { intersection } from "../intersection.js"
import type { Node } from "../node.js"

type PropTypes = {
    readonly number?: Node
    readonly string?: Node
}

export type ChildrenAttribute = {
    readonly props?: dict<Node>
    readonly propTypes?: PropTypes
    readonly requiredKeys?: keySet
}

export const childrenIntersection: KeyIntersection<ChildrenAttribute> = (
    l,
    r,
    scope
) => {
    const result = { ...l, ...r }
    let k: keyof ChildrenAttribute
    for (k in result) {
        if (l[k] && r[k]) {
            if (k === "requiredKeys") {
                result[k] = { ...l[k], ...r[k] }
            } else {
                // TODO: never propagation
                result[k] = propsIntersection(l[k]!, r[k]!, scope)
            }
        }
    }
    return result
}

const propsIntersection = <props extends dict<Node>>(
    l: props,
    r: props,
    scope: ScopeRoot
) => {
    const result: props = { ...l, ...r }
    for (const k in result) {
        if (l[k] && r[k]) {
            result[k] = intersection(l[k], r[k], scope) as any
        }
    }
    return result
}

export const checkChildren = (
    data: object,
    children: ChildrenAttribute,
    scope: ScopeRoot
) => {
    if (hasObjectSubtype(data, "array") && isSimpleArray(children)) {
        return data.every((elementData) =>
            checkNode(elementData, children.propTypes.number, scope)
        )
    }
    const missingKeys: mutable<keySet> = { ...children.requiredKeys }
    for (const k in data) {
        const propValue = (data as dict)[k]
        if (
            children.props?.[k] &&
            !checkNode(propValue, children.props[k], scope)
        ) {
            return false
        }
        if (children.propTypes) {
            const keyIsNumber = tryParseWellFormedNumber(k) !== undefined
            if (
                keyIsNumber &&
                children.propTypes.number &&
                !checkNode(propValue, children.propTypes.number, scope)
            ) {
                return false
            } else if (
                children.propTypes.string &&
                !checkNode(propValue, children.propTypes.string, scope)
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
    children: ChildrenAttribute
): children is { propTypes: { number: Node } } =>
    !children.props &&
    !children.requiredKeys &&
    children.propTypes?.number !== undefined &&
    Object.keys(children.propTypes).length === 1
