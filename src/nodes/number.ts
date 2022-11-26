import { isEmpty } from "../utils/deepEquals.js"
import type { mutable, xor } from "../utils/generics.js"
import type { Bounds } from "./bounds.js"
import { checkBounds, intersectBounds, subtractBounds } from "./bounds.js"
import type { Never } from "./degenerate.js"
import { isNever } from "./degenerate.js"
import { subtractValues } from "./values.js"

export type NumberAttributes = xor<
    {
        readonly divisor?: number
        readonly bounds?: Bounds
    },
    { readonly values?: readonly number[] }
>

const intersectDivisors = (l: number | undefined, r: number | undefined) =>
    l && r ? Math.abs((l * r) / greatestCommonDivisor(l, r)) : l ?? r

const subtractDivisors = (l: number | undefined, r: number | undefined) => {
    if (!l) {
        return undefined
    }
    if (!r) {
        return l
    }
    const relativelyPrimeA = Math.abs(l / greatestCommonDivisor(l, r))
    return relativelyPrimeA === 1 ? undefined : relativelyPrimeA
}

export const checkNumber = (data: number, attributes: NumberAttributes) =>
    attributes.values
        ? attributes.values.includes(data)
        : (!attributes.bounds || checkBounds(attributes.bounds, data)) &&
          (!attributes.divisor || data % attributes.divisor === 0)

export const intersectNumbers = (
    l: NumberAttributes,
    r: NumberAttributes
): NumberAttributes | Never => {
    if (l.values || r.values) {
        const values = l.values ?? r.values!
        const attributes = l.values ? r : l
        const result = values.filter((value) => checkNumber(value, attributes))
        return result.length
            ? { values: result }
            : [
                  {
                      type: "never",
                      reason: `none of ${JSON.stringify(
                          values
                      )} satisfy ${JSON.stringify(attributes)}`
                  }
              ]
    }
    const result: mutable<NumberAttributes> = {}
    const divisor = intersectDivisors(l.divisor, r.divisor)
    if (divisor) {
        result.divisor = divisor
    }
    const boundsResult = intersectBounds(l.bounds, r.bounds)
    if (boundsResult) {
        if (isNever(boundsResult)) {
            return boundsResult
        }
        result.bounds = boundsResult
    }
    return result
}

export const subtractNumbers = (
    l: NumberAttributes,
    r: NumberAttributes
): NumberAttributes | undefined => {
    if (l.values) {
        const values = r.values ? subtractValues(l.values, r.values) : l.values
        return values?.length ? { values } : undefined
    }
    const result: mutable<NumberAttributes> = {}
    const divisor = subtractDivisors(l.divisor, r.divisor)
    if (divisor) {
        result.divisor = divisor
    }
    const boundsResult = subtractBounds(l.bounds, r.bounds)
    if (boundsResult) {
        result.bounds = boundsResult
    }
    return isEmpty(result) ? undefined : result
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
