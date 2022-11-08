import type { defined, keyOrKeySet, keySet } from "../../utils/generics.js"
import { isKeyOf } from "../../utils/generics.js"
import { intersectBounds } from "../operator/bounds/shared.js"
import { Divisor } from "../operator/divisor.js"
import type {
    AttributeCases,
    AttributeKey,
    Attributes,
    AttributeTypes,
    BranchAttributeKey,
    TypeAttribute
} from "./attributes.js"
import { branchKeys } from "./attributes.js"

export const add = <k extends AttributeKey>(
    attributes: Attributes,
    k: k,
    value: AttributeTypes[k]
): Attributes => {
    const attributesToAdd: Attributes = { [k]: value }
    if (!attributes[k] && isKeyOf(k, impliedTypes)) {
        const impliedType = impliedTypes[k]
        if (typeof impliedType === "string") {
            attributesToAdd.type = impliedType
        } else {
            attributesToAdd.switch = {
                path: "",
                key: "type",
                cases: impliedType
            }
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
    const intersected = { ...a, ...b }
    let k: AttributeKey
    for (k in intersected) {
        if (isKeyOf(k, branchKeys)) {
        } else if (k in a && k in b) {
            const intersectedValue = dynamicIntersectors[k](a[k], b[k])
            if (intersectedValue === null) {
                a.contradiction = `${a[k]} and ${b[k]} have an empty intersection`
            } else {
                intersected[k] = intersectedValue
            }
        }
    }
    return intersected
}

const intersectIrreducibleAttribute = <t extends string>(
    a: keyOrKeySet<t>,
    b: keyOrKeySet<t>
): keyOrKeySet<t> => {
    if (typeof a === "string") {
        if (typeof b === "string") {
            return a === b ? a : ({ [a]: true, [b]: true } as keySet<t>)
        }
        b[a] = true
        return b
    }
    if (typeof b === "string") {
        a[b] = true
        return a
    }
    return Object.assign(a, b)
}

const intersectDisjointAttribute = <value extends string>(a: value, b: value) =>
    a === b ? a : null

type IntersectableKey = Exclude<AttributeKey, BranchAttributeKey>

type IntersectorsByKey = {
    [k in IntersectableKey]: Intersector<k>
}

const intersectors: IntersectorsByKey = {
    value: intersectDisjointAttribute,
    type: intersectDisjointAttribute,
    requiredKeys: (a, b) => Object.assign(a, b),
    alias: intersectIrreducibleAttribute,
    contradiction: intersectIrreducibleAttribute,
    divisor: (a, b) => Divisor.intersect(a, b),
    regex: (a, b) => intersectIrreducibleAttribute(a, b),
    bounds: intersectBounds,
    props: (a, b) => {
        for (const k in a) {
            if (k in b) {
                b[k] = intersect(a[k], b[k])
            }
        }
        return Object.assign(a, b)
    }
}

const dynamicIntersectors = intersectors as {
    [k in IntersectableKey]: (a: unknown, b: unknown) => any
}

type TypeImplyingKey = "divisor" | "regex" | "bounds"

const impliedTypes: {
    [k in TypeImplyingKey]: TypeAttribute | AttributeCases<"type">
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
    b: defined<Attributes[k]>
) => defined<Attributes[k]> | null
