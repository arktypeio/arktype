import { isEmpty } from "../../utils/deepEquals.js"
import type { mutable, xor } from "../../utils/generics.js"
import type { Bounds } from "../bounds.js"
import { checkBounds, intersectBounds, subtractBounds } from "../bounds.js"
import { subtractValues } from "../utils.js"
import { isNever } from "./degenerate.js"
import type { TypeOperations } from "./operations.js"

export type NumberAttributes = xor<
    {
        readonly divisor?: number
        readonly bounds?: Bounds
    },
    { readonly values?: readonly number[] }
>

export const numbers: TypeOperations<number, NumberAttributes> = {
    intersect: (l, r) => {
        if (l.values || r.values) {
            const values = l.values ?? r.values!
            const attributes = l.values ? r : l
            const result = values.filter((value) =>
                numbers.check(value, attributes)
            )
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
    },
    subtract: (l, r) => {
        if (l.values) {
            const values = r.values
                ? subtractValues(l.values, r.values)
                : l.values
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
    },
    check: (data, attributes) =>
        attributes.values
            ? attributes.values.includes(data)
            : (!attributes.bounds || checkBounds(attributes.bounds, data)) &&
              (!attributes.divisor || data % attributes.divisor === 0)
}

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
