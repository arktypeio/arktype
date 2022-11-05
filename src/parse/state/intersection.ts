import type { defined, mutable } from "../../utils/generics.js"
import { isKeyOf, keysOf } from "../../utils/generics.js"
import { throwInternalError } from "../../utils/internalArktypeError.js"
import { intersectBounds } from "../operator/bounds/shared.js"
import { Divisor } from "../operator/divisor.js"
import type {
    AttributeKey,
    Attributes,
    keyOrKeySet,
    keySet,
    TypeAttributeName
} from "./attributes.js"

export const add = <k extends AttributeKey>(
    attributes: Attributes,
    k: k,
    value: Exclude<Attributes[k], undefined>
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

const intersect = (a: Attributes, b: Attributes): Attributes => {
    const result = { ...a }
    let k: AttributeKey
    for (k in b) {
        if (k in a) {
            const intersectedValue = dynamicReducers[k](a[k], b[k])
            if (isEmptyIntersection(intersectedValue)) {
                result.contradiction += `Whoops`
            }
            result[k] = intersectedValue
        } else {
            result[k] = b[k] as any
        }
    }
    return result
}

const intersectAdditiveAttribute = <t extends string>(
    a: keyOrKeySet<t>,
    b: keyOrKeySet<t>
): keyOrKeySet<t> => {
    if (typeof a === "string") {
        if (typeof b === "string") {
            return a === b ? a : ({ [a]: true, [b]: true } as keySet<t>)
        }
        return { ...b, [a]: true }
    }
    if (typeof b === "string") {
        return { ...a, [b]: true }
    }
    return { ...a, ...b }
}

const intersectDisjointAttribute = <k extends string>(
    a: keyOrKeySet<k>,
    b: keyOrKeySet<k>
): keyOrKeySet<k> | null => {
    if (typeof a === "string") {
        if (typeof b === "string") {
            return a === b ? a : null
        }
        return a in b ? a : null
    }
    if (typeof b === "string") {
        return b in a ? b : null
    }
    const intersectionSet = intersectKeySets(a, b)
    const intersectingKeys = keysOf(intersectionSet)
    return intersectingKeys.length === 0
        ? null
        : intersectingKeys.length === 1
        ? intersectingKeys[0]
        : intersectionSet
}

const intersectKeySets = <k extends string>(
    a: keySet<k>,
    b: keySet<k>
): keySet<k> => {
    const intersectionSet = {} as mutable<keySet<k>>
    for (const k in a) {
        if (b[k]) {
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
    divisor: (a, b) => Divisor.intersect(a, b),
    regex: (a, b) => intersectAdditiveAttribute(a, b),
    bounds: intersectBounds,
    requiredKey: (a, b) => intersectKeySets(a, b),
    alias: intersectAdditiveAttribute,
    baseProp: (a, b) => intersect(a, b),
    props: (a, b) => {
        const intersectedProps = { ...a, ...b }
        for (const k in intersectedProps) {
            if (k in a && k in b) {
                intersectedProps[k] = intersect(a[k], b[k])
            }
        }
        return intersectedProps
    },
    branches: (a, b) => {
        // TODO: Fix
        return a
    },
    contradictions: (a, b) => {
        return a
    },
    parent: () =>
        throwInternalError(`Unexpected attempt to intersect attribute parents.`)
}

const dynamicReducers = intersectors as {
    [k in AttributeKey]: (a: unknown, b: unknown) => any
}

type TypeImplyingKey = "divisor" | "regex" | "bounds"

const impliedTypes: {
    [k in TypeImplyingKey]: TypeAttributeName
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

export type EmptyIntersectionResult<t> = [aConflicting: t, bConflicting: t]

export type Intersector<k extends AttributeKey> = (
    a: defined<Attributes[k]>,
    value: defined<Attributes[k]>
) =>
    | defined<Attributes[k]>
    | (k extends ContradictableKey
          ? EmptyIntersectionResult<Attributes[k]>
          : never)
