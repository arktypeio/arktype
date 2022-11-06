import type {
    defined,
    keyOrKeySet,
    keyOrPartialKeySet,
    keySet,
    mutable
} from "../../utils/generics.js"
import { isKeyOf } from "../../utils/generics.js"
import { throwInternalError } from "../../utils/internalArktypeError.js"
import { intersectBounds } from "../operator/bounds/shared.js"
import { Divisor } from "../operator/divisor.js"
import type {
    AttributeBranches,
    AttributeKey,
    Attributes,
    TypeAttribute
} from "./attributes.js"

export const add = <k extends AttributeKey>(
    attributes: Attributes,
    k: k,
    value: Exclude<Attributes[k], undefined>
): Attributes => {
    const attributesToAdd: mutable<Attributes> = { [k]: value }
    if (!attributes[k] && isKeyOf(k, impliedTypes)) {
        const impliedType = impliedTypes[k]
        if (typeof impliedType === "string") {
            attributesToAdd.type = impliedType
        } else {
            attributesToAdd.branches = ["type", impliedType]
        }
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
            if (intersectedValue === null) {
                result.contradiction = `${a[k]} and ${b[k]} have an empty intersection`
            } else {
                result[k] = intersectedValue
            }
        } else {
            result[k] = b[k] as any
        }
    }
    return result
}

const intersectIrreducibleAttribute = <t extends string>(
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

const intersectDisjointAttribute = <value extends string>(a: value, b: value) =>
    a === b ? a : null

type IntersectorsByKey = {
    [k in AttributeKey]: Intersector<k>
}

const intersectors: IntersectorsByKey = {
    value: intersectDisjointAttribute,
    type: intersectDisjointAttribute,
    requiredKeys: (a, b) => ({ ...a, ...b }),
    alias: intersectIrreducibleAttribute,
    contradiction: intersectIrreducibleAttribute,
    divisor: (a, b) => Divisor.intersect(a, b),
    regex: (a, b) => intersectIrreducibleAttribute(a, b),
    bounds: intersectBounds,
    baseProp: (a, b) => intersect(a, b),
    paths: (a, b) => {
        const intersected = { ...a, ...b }
        for (const k in intersected) {
            if (k in a && k in b) {
                intersected[k] = intersect(a[k], b[k])
            }
        }
        return intersected
    },
    branches: (a, b) => {
        // TODO: Fix
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
    [k in TypeImplyingKey]: TypeAttribute | AttributeBranches[1]
} = {
    divisor: "number",
    bounds: {
        number: {},
        string: {},
        array: {}
    },
    regex: "string"
}

export type Intersector<k extends AttributeKey> = (
    a: defined<Attributes[k]>,
    value: defined<Attributes[k]>
) => defined<Attributes[k]> | null

// const intersectDisjointAttribute = <k extends string>(
//     a: keyOrKeySet<k>,
//     b: keyOrKeySet<k>
// ): keyOrKeySet<k> | null => {
//     if (typeof a === "string") {
//         if (typeof b === "string") {
//             return a === b ? a : null
//         }
//         return a in b ? a : null
//     }
//     if (typeof b === "string") {
//         return b in a ? b : null
//     }
//     const intersectionSet = intersectKeySets(a, b)
//     const intersectingKeys = keysOf(intersectionSet)
//     return intersectingKeys.length === 0
//         ? null
//         : intersectingKeys.length === 1
//         ? intersectingKeys[0]
//         : intersectionSet
// }
