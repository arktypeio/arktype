import type { mutable } from "../../utils/generics.js"
import { isKeyOf, keysOf } from "../../utils/generics.js"
import { intersectBounds } from "../operator/bounds/shared.js"
import { Divisor } from "../operator/divisor.js"
import type {
    AttributeKey,
    Attributes,
    AttributeTypes,
    ContradictableKey,
    ContradictionKind,
    Contradictions,
    keyOrKeySet,
    keySet,
    TypeAttribute
} from "./attributes.js"

export const add = <k extends AttributeKey>(
    attributes: Attributes,
    k: k,
    value: AttributeTypes[k]
): Attributes => {
    const attributesToAdd: mutable<Attributes> = { [k]: value }
    if (!attributes[k] && isKeyOf(k, impliedTypes)) {
        attributesToAdd.type = impliedTypes[k]
    }
    return intersect(attributes, attributesToAdd)
}

export const intersection = (branches: Attributes[]) => {
    while (branches.length > 1) {
        branches.unshift(intersect(branches.pop()!, branches.pop()!))
    }
    return branches[0]
}

const intersect = (left: Attributes, right: Attributes): Attributes => {
    const result = { ...left }
    let contradictions: mutable<Contradictions> | undefined
    let k: AttributeKey
    for (k in right) {
        if (k in left) {
            const intersectedValue = dynamicReducers[k](left[k], right[k])
            if (isEmptyIntersection(intersectedValue)) {
                contradictions ??= {}
                contradictions[k as ContradictableKey] = intersectedValue as any
            }
            result[k] = intersectedValue
        } else {
            result[k] = right[k] as any
        }
    }
    if (contradictions) {
        result.contradictions = result.contradictions
            ? intersectors.contradictions(result.contradictions, contradictions)
            : contradictions
    }
    return result
}

const intersectAdditiveAttribute = <t extends string>(
    left: keyOrKeySet<t>,
    right: keyOrKeySet<t>
): keyOrKeySet<t> => {
    if (typeof left === "string") {
        if (typeof right === "string") {
            return left === right
                ? left
                : ({ [left]: true, [right]: true } as keySet<t>)
        }
        return { ...right, [left]: true }
    }
    if (typeof right === "string") {
        return { ...left, [right]: true }
    }
    return { ...left, ...right }
}

const intersectDisjointAttribute = <k extends string>(
    left: keyOrKeySet<k>,
    right: keyOrKeySet<k>
): MaybeEmptyIntersection<keyOrKeySet<k>> => {
    if (typeof left === "string") {
        if (typeof right === "string") {
            return left === right ? left : [left, right]
        }
        return left in right ? left : [left, right]
    }
    if (typeof right === "string") {
        return right in left ? right : [left, right]
    }
    const intersectionSet = intersectKeySets(left, right)
    const intersectingKeys = keysOf(intersectionSet)
    return intersectingKeys.length === 0
        ? [left, right]
        : intersectingKeys.length === 1
        ? intersectingKeys[0]
        : intersectionSet
}

const intersectKeySets = <k extends string>(
    left: keySet<k>,
    right: keySet<k>
): keySet<k> => {
    const intersectionSet = {} as mutable<keySet<k>>
    for (const k in left) {
        if (right[k]) {
            intersectionSet[k] = true
        }
    }
    return intersectionSet
}

type IntersectorsByKey = {
    [k in AttributeKey]: Intersector<k>
}

const intersectors: IntersectorsByKey = {
    value: intersectDisjointAttribute,
    type: intersectDisjointAttribute,
    divisor: (left, right) => Divisor.intersect(left, right),
    regex: (left, right) => intersectAdditiveAttribute(left, right),
    bounds: intersectBounds,
    requiredKeys: (left, right) => intersectKeySets(left, right),
    aliases: intersectAdditiveAttribute,
    baseProp: (left, right) => intersect(left, right),
    props: (left, right) => {
        const intersectedProps = { ...left, ...right }
        for (const k in intersectedProps) {
            if (k in left && k in right) {
                intersectedProps[k] = intersect(left[k], right[k])
            }
        }
        return intersectedProps
    },
    branches: (left, right) => {
        // TODO: Fix
        return left
    },
    contradictions: (left, right) => {
        const result = { ...left }
        let k: ContradictionKind
        for (k in right) {
            if (k === "never") {
                result.never = true
            } else {
                result[k] ??= right[k] as any
            }
        }
        return result
    }
}

const dynamicReducers = intersectors as {
    [k in AttributeKey]: (left: unknown, right: unknown) => any
}

type TypeImplyingKey = "divisor" | "regex" | "bounds"

const impliedTypes: {
    [k in TypeImplyingKey]: TypeAttribute
} = {
    divisor: "number",
    bounds: {
        number: true,
        string: true,
        array: true
    },
    regex: "string"
}

export const isEmptyIntersection = (
    intersection: unknown
): intersection is EmptyIntersectionResult<unknown> =>
    Array.isArray(intersection)

export type MaybeEmptyIntersection<t> = t | EmptyIntersectionResult<t>

export type EmptyIntersectionResult<t> = [
    leftConflicting: t,
    rightConflicting: t
]

export type Intersector<k extends AttributeKey> = (
    left: AttributeTypes[k],
    value: AttributeTypes[k]
) =>
    | AttributeTypes[k]
    | (k extends ContradictableKey
          ? EmptyIntersectionResult<AttributeTypes[k]>
          : never)
