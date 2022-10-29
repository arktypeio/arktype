import type { dictionary, DynamicTypeName } from "../internal.js"
import type { Enclosed } from "../parser/string/operand/enclosed.js"
import { UnenclosedNumber } from "../parser/string/operand/numeric.js"

// TODO: Figure out mutations
export const compressUnion = (
    { ...base }: Attributes,
    { ...branch }: Attributes
) => {
    let k: keyof Attributes
    const baseAttributesToDistribute: Attributes = {}
    for (k in branch) {
        if (k in base) {
            if (base[k] === branch[k]) {
                // The branch attribute is redundant and can be removed.
                delete branch[k]
            } else {
                // The attribute had distinct values for base and branch. Once we're
                // done looping over branch attributes, distribute it to each
                // existing branch and remove it from base.
                baseAttributesToDistribute[k] = base[k] as any
                delete base[k]
            }
        }
        // The branch attribute was not previously part of base and is safe to push to branches.
    }
    if (!Object.keys(branch).length) {
        // All keys were redundant, no need to push the new branch
        return
    }
    base.branches ??= []
    for (const branch of base.branches) {
        intersect(branch, baseAttributesToDistribute)
    }
    base.branches.push(branch)
    return base
}

export const intersect = (left: Attributes, right: Attributes) => {
    const intersection: Attributes = { ...left, ...right }
    let k: keyof Attributes
    for (k in left) {
        if (intersection[k] !== left[k]) {
            intersection[k] = merge(intersection[k], left[k])
        }
    }
    return intersection
}

const merge = (left: any, right: any) => left

const defineIntersectionReducers = <
    intersections extends {
        [key in ReducibleKey]?: (
            base: Attributes & { [k in key]: AttributeTypes[k] },
            value: AttributeTypes[key]
        ) => AttributeTypes[key]
    }
>(
    intersections: intersections
) => intersections

const reducers = defineIntersectionReducers({
    value: (base, intersected) => {
        base.contradiction = {
            key: "value",
            base: base.value,
            intersected
        }
        return base.value
    },
    type: (base, intersected) => {
        base.contradiction = {
            key: "type",
            base: base.type,
            intersected
        }
        return base.type
    },
    divisor: (base, intersected) =>
        leastCommonMultiple(base.divisor, intersected),
    regex: (base, intersected) => `${base.regex}${intersected}`,
    bounds: (base, intersected) => {
        let updatableBounds = parseBounds(base.bounds)
        const { min, max } = parseBounds(intersected)
        if (min) {
            const result = intersectBound("min", updatableBounds, min)
            if (!result) {
                base.contradiction = createBoundsContradiction(
                    "min",
                    updatableBounds,
                    min
                )
                return base.bounds
            }
            updatableBounds = result
        }
        if (max) {
            const result = intersectBound("max", updatableBounds, max)
            if (!result) {
                base.contradiction = createBoundsContradiction(
                    "max",
                    updatableBounds,
                    max
                )
                return base.bounds
            }
            updatableBounds = result
        }
        return encodeBounds(updatableBounds)
    }
})

type EncodedMin = `${">" | ">="}${number}` | ""
type EncodedMax = `${"<" | "<="}${number}` | ""
type BoundsString = `${EncodedMin},${EncodedMax}`

type AtomicAttributeTypes = {
    value: string | number | boolean | bigint | null | undefined
    type: DynamicTypeName
    divisor: number
    regex: Enclosed.RegexLiteral
    bounds: BoundsString
}

type AtomicKey = keyof AtomicAttributeTypes

type ComposedAttributeTypes = {
    baseProp: Attributes
    props: dictionary<Attributes>
    branches: Attributes[]
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
    intersected: AtomicAttributeTypes[key]
}

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
    min: ParsedBound | undefined
    max: ParsedBound | undefined
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
    }` as BoundsString

const parseBounds = (boundsString: BoundsString): ParsedBounds => {
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
            "Unexpectedly failed to parse bound."
        ),
        inclusive
    }
}

const intersectBound = (
    kind: BoundKind,
    base: ParsedBounds,
    bound: ParsedBound
): ParsedBounds | false => {
    const invertedKind = invertedKinds[kind]
    const baseCompeting = base[kind]
    const baseOpposing = base[invertedKind]
    if (baseOpposing && isStricter(invertedKind, bound, baseOpposing)) {
        return false
    }
    if (!baseCompeting || isStricter(kind, bound, baseCompeting)) {
        return { ...base, [kind]: bound }
    }
    return base
}

const createBoundsContradiction = (
    kind: BoundKind,
    base: ParsedBounds,
    bound: ParsedBound
): Contradiction => ({
    key: "bounds",
    base: encodeBounds(base),
    intersected: encodeBounds({
        ...base,
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
