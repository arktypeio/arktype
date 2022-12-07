import type { ScopeRoot } from "../scope.js"
import type { Dictionary } from "../utils/generics.js"
import { tryParseWellFormedNumber } from "../utils/numericLiterals.js"
import type { ObjectTypeName } from "../utils/typeOf.js"
import { hasObjectType } from "../utils/typeOf.js"
import type { Bounds } from "./bounds.js"
import { boundsIntersection } from "./bounds.js"
import { checkNode } from "./check.js"
import { composeKeyedIntersection, intersection } from "./intersection.js"
import type { Node } from "./node.js"

type OptionalProp = ["?", Node]

type Prop = Node | OptionalProp

const isOptional = (prop: Prop): prop is OptionalProp =>
    (prop as Dictionary)[0] === "?"

type PropTypesAttribute = {
    readonly number?: Node
    readonly string?: Node
}

export type ObjectAttributes = {
    readonly props?: Dictionary<Prop>
    readonly propTypes?: PropTypesAttribute
    readonly subtype?: ObjectTypeName
    readonly bounds?: Bounds
}

const propsIntersection = composeKeyedIntersection<Dictionary<Prop>>(
    (k, l, r, scope) =>
        isOptional(l)
            ? isOptional(r)
                ? ["?", intersection(l[1], r[1], scope)]
                : intersection(l[1], r, scope)
            : intersection(l, isOptional(r) ? r[1] : r, scope)
)

const propTypesIntersection = composeKeyedIntersection<PropTypesAttribute>(
    (k, l, r, scope) => intersection(l, r, scope)
)

export const objectIntersection = composeKeyedIntersection<ObjectAttributes>({
    subtype: (l, r) => l === r,
    props: propsIntersection,
    propTypes: propTypesIntersection,
    bounds: boundsIntersection
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
    const unseenProps = { ...attributes.props }
    for (const k in data) {
        const propValue = (data as Dictionary)[k]
        const propAttributes = attributes.props?.[k]
        if (propAttributes) {
            const propNode = isOptional(propAttributes)
                ? propAttributes[1]
                : propAttributes
            if (!checkNode(propValue, propNode, scope)) {
                return false
            }
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
        delete unseenProps[k]
    }
    for (const k in unseenProps) {
        if (!isOptional(attributes.props![k]!)) {
            return false
        }
    }
    return true
}

const isSimpleArray = (
    children: ObjectAttributes
): children is { propTypes: { number: Node } } =>
    !children.props &&
    children.propTypes?.number !== undefined &&
    Object.keys(children.propTypes).length === 1
