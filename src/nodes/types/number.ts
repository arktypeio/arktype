import { isEmpty } from "../../utils/deepEquals.js"
import type { mutable, xor } from "../../utils/generics.js"
import type { Bounds } from "../bounds.js"
import { checkBounds, intersectBounds, pruneBounds } from "../bounds.js"
import type { IntersectFn, PruneFn } from "../node.js"
import { isNever } from "./degenerate.js"
import { pruneValues } from "./utils.js"

export type NumberAttributes = xor<
    {
        readonly divisor?: number
        readonly bounds?: Bounds
    },
    { readonly values?: readonly number[] }
>

export const intersectNumbers: IntersectFn<NumberAttributes> = (l, r) => {
    if (l.values || r.values) {
        const values = l.values ?? r.values!
        const attributes = l.values ? r : l
        const result: number[] = values.filter((value) =>
            checkNumber(value, attributes)
        )
        return result.length
            ? { values: result }
            : {
                  type: "never",
                  reason: `none of ${JSON.stringify(
                      values
                  )} satisfy ${JSON.stringify(attributes)}`
              }
    }
    const result = { ...l, ...r } as mutable<NumberAttributes>
    if (l.divisor && r.divisor) {
        result.divisor = intersectDivisors(l.divisor, r.divisor)
    }
    if (l.bounds && r.bounds) {
        const boundsResult = intersectBounds(l.bounds, r.bounds)
        if (isNever(boundsResult)) {
            return boundsResult
        }
        result.bounds = boundsResult
    }
    return result
}

export const pruneNumber: PruneFn<NumberAttributes> = (l, r) => {
    if (l.values) {
        const values = r.values ? pruneValues(l.values, r.values) : l.values
        return values?.length ? { values } : undefined
    }
    const result: mutable<NumberAttributes> = {}
    if (l.divisor && r.divisor) {
        const divisor = pruneDivisors(l.divisor, r.divisor)
        if (divisor) {
            result.divisor = divisor
        }
    }
    if (l.bounds && r.bounds) {
        const bounds = pruneBounds(l.bounds, r.bounds)
        if (bounds) {
            result.bounds = bounds
        }
    }
    if (!isEmpty(result)) {
        return result
    }
}

export const checkNumber = (data: number, attributes: NumberAttributes) =>
    attributes.values
        ? attributes.values.includes(data)
        : (!attributes.bounds || checkBounds(attributes.bounds, data)) &&
          (!attributes.divisor || data % attributes.divisor === 0)

const intersectDivisors = (l: number | undefined, r: number | undefined) =>
    l && r ? Math.abs((l * r) / greatestCommonDivisor(l, r)) : l ?? r

const pruneDivisors = (l: number | undefined, r: number | undefined) => {
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
