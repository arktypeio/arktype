import { assert } from "@re-/assert"
import * as fc from "fast-check"
import { DynamicType } from "../../../../type.js"
import { Keyword } from "../../../operand/index.js"
import { BoundDefinition, boundValidationError } from "../bound.js"
import {
    Comparator,
    comparators,
    DoubleBoundComparator,
    doubleBoundComparators
} from "../common.js"

const keysOf = (o: object) => Object.keys(o)

export const arbitraryKeywordList = fc.constantFrom(
    ...keysOf(Keyword.nodes).map((_) => `${_}[]`)
)
export const arbitraryNumberKeyword = fc.constantFrom(
    ...keysOf(Keyword.numberNodes)
)
export const arbitraryStringKeyword = fc.constantFrom(
    ...keysOf(Keyword.numberNodes)
)
export const aribtraryBoundable = fc.oneof(
    arbitraryNumberKeyword,
    arbitraryStringKeyword,
    arbitraryKeywordList
)
export const arbitraryComparator = fc.constantFrom(
    ...(Object.keys(comparators) as Comparator[])
)
export const arbitraryDoubleComparator = fc.constantFrom(
    ...(Object.keys(doubleBoundComparators) as DoubleBoundComparator[])
)
const boundRange = { min: -1000, max: 1000 }
export const arbitraryLimit = fc
    .oneof(fc.float(boundRange), fc.integer(boundRange))
    .map((limit) => Number.parseFloat(limit.toFixed(2)))

const expectedCheckResult = (bounds: BoundDefinition[], actual: number) => {
    for (const [comparator, limit] of bounds) {
        const possibleExpectedError: boundValidationError = {
            comparator,
            limit,
            actual,
            source: actual
        }
        if (actual > limit && !comparator.includes(">")) {
            return possibleExpectedError
        } else if (actual < limit && !comparator.includes("<")) {
            return possibleExpectedError
        } else if (actual === limit && !comparator.includes("=")) {
            return possibleExpectedError
        }
    }
}

const assertCheckResult = (
    node: DynamicType,
    bounds: BoundDefinition[],
    actual: number
) => {
    const actualError = node.check(actual).errors
    assert(actualError).equals(expectedCheckResult(bounds, actual))
}

export const assertCheckResults = (
    node: DynamicType,
    bounds: BoundDefinition[]
) => {
    for (const bound of bounds) {
        assertCheckResult(node, bounds, bound[1] - 1)
        assertCheckResult(node, bounds, bound[1])
        assertCheckResult(node, bounds, bound[1] + 1)
    }
}
