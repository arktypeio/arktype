import type { xor } from "../utils/generics.js"
import { hasKey } from "../utils/generics.js"
import type { Bounds } from "./bounds.js"
import { boundsOperations, checkBounds } from "./bounds.js"
import type { AttributeOperations, DataTypeOperations } from "./shared.js"

export type NumberAttributes = xor<
    {
        readonly divisor?: number
        readonly bounds?: Bounds
    },
    { readonly values?: readonly number[] }
>

export const divisorOperations: AttributeOperations<number> = {
    intersect: (l, r) => Math.abs((l * r) / greatestCommonDivisor(l, r)),
    subtract: (l, r) => {
        const relativelyPrimeA = Math.abs(l / greatestCommonDivisor(l, r))
        return relativelyPrimeA === 1 ? null : relativelyPrimeA
    }
}

export const checkNumber = (attributes: NumberAttributes, data: number) => {
    if (hasKey(attributes, "bounds") && !checkBounds(attributes.bounds, data)) {
        return false
    }
    if (hasKey(attributes, "divisor") && data % attributes.divisor !== 0) {
        return false
    }
    return true
}

export const numberAttributes: DataTypeOperations<NumberAttributes> = {
    bounds: boundsOperations,
    divisor: divisorOperations
}

// https://en.wikipedia.org/wiki/Euclidean_algorithm
const greatestCommonDivisor = (l: number, r: number) => {
    let previous
    let greatestCommonDivisor = l
    let current = r
    while (current !== 0) {
        previous = current
        current = greatestCommonDivisor % current
        greatestCommonDivisor = previous
    }
    return greatestCommonDivisor
}
