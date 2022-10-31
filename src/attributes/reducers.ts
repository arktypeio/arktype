import type { dictionary, DynamicTypeName } from "../internal.js"
import type { Enclosed } from "../parser/string/operand/enclosed.js"
import { UnenclosedNumber } from "../parser/string/operand/numeric.js"

// TODO: Figure out mutations
export const union = (left: Attributes, right: Attributes) => {
    const baseAttributesToDistribute: Attributes = {}
    let k: keyof Attributes
    for (k in right) {
        if (k in left) {
            // TODO: What to do with composable here
            // if (
            //     (left.branches && left.branches.length > 1) ||
            //     (right.branches && right.branches.length > 1)
            // ) {
            //     // If left or right is already a branch intersection, create a new root for the union
            //     return {
            //         branches: [left, right]
            //     }
            // }
            if (left[k] === right[k]) {
                // The branch attribute is redundant and can be removed.
                delete right[k]
            } else {
                // The attribute had distinct values for base and branch. Once we're
                // done looping over branch attributes, distribute it to each
                // existing branch and remove it from base.
                baseAttributesToDistribute[k] = left[k] as any
                delete left[k]
            }
        }
        // The branch attribute was not previously part of base and is safe to push to branches.
    }
    if (!Object.keys(right).length) {
        // All keys were redundant, no need to push the new branch
        return
    }
    left.branches ??= []
    for (const branch of left.branches) {
        intersect(branch, baseAttributesToDistribute)
    }
    left.branches.push(right)
    return left
}

const compressRedundant = (left: Attributes, right: Attributes) => {}

export const intersect = (base: Attributes, attributes: Attributes) => {
    const intersection: Attributes = { ...base, ...attributes }
    let k: keyof Attributes
    for (k in base) {
        if (intersection[k] !== base[k]) {
            intersection[k] = merge(intersection[k], base[k])
        }
    }
    return intersection
}

const merge = (left: any, right: any) => left

const defineIntersectionReducers = <
    intersections extends {
        [key in ReducibleKey]?: (
            base: AttributeTypes[key],
            value: AttributeTypes[key]
        ) => AttributeTypes[key] | Contradiction
    }
>(
    intersections: intersections
) => intersections

const defineUnionReducers = <
    intersections extends {
        [key in ReducibleKey]?: (
            base: AttributeTypes[key],
            value: AttributeTypes[key]
        ) => AttributeTypes[key] | Contradiction
    }
>(
    intersections: intersections
) => intersections

const intersectionReducers = defineIntersectionReducers({
    value: (base, value) => ({
        key: "value",
        base,
        conflicting: value
    }),
    type: (base, value) => ({
        key: "type",
        base,
        conflicting: value
    }),
    divisor: (base, value) => leastCommonMultiple(base, value),
    regex: (base, value) => `${base}${value}`,
    bounds: (base, value) => {
        let updatableBounds = parseBounds(base)
        const { min, max } = parseBounds(value)
        if (min) {
            const result = intersectBound("min", updatableBounds, min)
            if (isContradiction(result)) {
                return result
            }
            updatableBounds = result
        }
        if (max) {
            const result = intersectBound("max", updatableBounds, max)
            if (isContradiction(result)) {
                return result
            }
            updatableBounds = result
        }
        return encodeBounds(updatableBounds)
    },
    baseProp: (base, value) => intersect(base, value),
    props: (base, value) => {
        const intersection = { ...base, ...value }
        for (const k in intersection) {
            if (k in base && k in value) {
                intersection[k] = intersect(base[k], value[k])
            }
        }
        return intersection
    },
    branches: (base, value) => [...base, ...value]
})

type EncodedMin = `${">" | ">="}${number}` | ""
type EncodedMax = `${"<" | "<="}${number}` | ""
type EncodedBounds = `${EncodedMin},${EncodedMax}`

type AtomicAttributeTypes = {
    value: string | number | boolean | bigint | null | undefined
    type: DynamicTypeName
    divisor: number
    regex: Enclosed.RegexLiteral
    bounds: EncodedBounds
}

type AtomicKey = keyof AtomicAttributeTypes

type ComposedAttributeTypes = {
    baseProp: Attributes
    props: dictionary<Attributes>
    branches: Attributes[][]
}

type ReducibleKey = AtomicKey | keyof ComposedAttributeTypes

type TransientAttributeTypes = {
    parent: Attributes
    contradiction: Contradiction
}

type AttributeTypes = AtomicAttributeTypes &
    ComposedAttributeTypes &
    TransientAttributeTypes

type Attributes = Partial<AttributeTypes>

type Contradiction<key extends AtomicKey = AtomicKey> = {
    key: key
    base: AtomicAttributeTypes[key]
    conflicting: AtomicAttributeTypes[key]
}

const isContradiction = (result: object): result is Contradiction =>
    "conflicting" in result

// Calculate the GCD, then divide the product by that to determine the LCM:
// https://en.wikipedia.org/wiki/Euclidean_algorithm
const leastCommonMultiple = (x: number, y: number) => {
    let previous
    let greatestCommonDivisor = x
    let current = y
    while (current !== 0) {
        previous = current
        current = greatestCommonDivisor % current
        greatestCommonDivisor = previous
    }
    return Math.abs((x * y) / greatestCommonDivisor)
}

type ParsedBounds = {
    min?: ParsedBound
    max?: ParsedBound
}

type ParsedBound = {
    limit: number
    inclusive: boolean
}

const encodeBounds = (bounds: ParsedBounds) =>
    `${
        bounds.min
            ? `>${bounds.min.inclusive ? "=" : ""}${bounds.min.limit}`
            : ""
    },${
        bounds.max
            ? `<${bounds.max.inclusive ? "=" : ""}${bounds.max.limit}`
            : ""
    }` as EncodedBounds

const parseBounds = (boundsString: EncodedBounds): ParsedBounds => {
    const [lowerString, upperString] = boundsString.split(",") as [
        EncodedMin,
        EncodedMax
    ]
    return {
        min: parseBound(lowerString),
        max: parseBound(upperString)
    }
}

const parseBound = (
    boundString: EncodedMin | EncodedMax
): ParsedBound | undefined => {
    if (boundString === "") {
        return
    }
    const inclusive = boundString[1] === "="
    return {
        limit: UnenclosedNumber.parseWellFormed(
            boundString.slice(inclusive ? 2 : 1),
            "number",
            true
        ),
        inclusive
    }
}

const intersectBound = (
    kind: BoundKind,
    base: ParsedBounds,
    bound: ParsedBound
): ParsedBounds | Contradiction<"bounds"> => {
    const invertedKind = invertedKinds[kind]
    const baseCompeting = base[kind]
    const baseOpposing = base[invertedKind]
    if (baseOpposing && isStricter(invertedKind, bound, baseOpposing)) {
        return createBoundsContradiction(kind, baseOpposing, bound)
    }
    if (!baseCompeting || isStricter(kind, bound, baseCompeting)) {
        base[kind] = bound
    }
    return base
}

const createBoundsContradiction = (
    kind: BoundKind,
    baseOpposing: ParsedBound,
    bound: ParsedBound
): Contradiction<"bounds"> => ({
    key: "bounds",
    base: encodeBounds({ [invertedKinds[kind]]: baseOpposing }),
    conflicting: encodeBounds({
        [kind]: bound
    })
})

const invertedKinds = {
    min: "max",
    max: "min"
} as const

type BoundKind = keyof typeof invertedKinds

const isStricter = (
    kind: BoundKind,
    candidateBound: ParsedBound,
    baseBound: ParsedBound
) => {
    if (
        candidateBound.limit === baseBound.limit &&
        candidateBound.inclusive === false &&
        baseBound.inclusive === true
    ) {
        return true
    } else if (kind === "min") {
        return candidateBound.limit > baseBound.limit
    } else {
        return candidateBound.limit < baseBound.limit
    }
}
