import { assert } from "@re-/assert"
import * as fc from "fast-check"
import { DynamicType } from "../../../../../type.js"
import { Keyword } from "../../../operand/index.js"
import { BoundsDefinition, boundViolationMessage } from "../bound.js"
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
const boundRange = { min: -1000, max: 1000, noNaN: true }
export const arbitraryLimit = fc
    .oneof(fc.float(boundRange), fc.integer(boundRange))
    .map((limit) => Number.parseFloat(limit.toFixed(2)))

const expectedCheckResult = (
    expectedBounds: BoundsDefinition,
    data: number
) => {
    for (const [comparator, limit] of expectedBounds) {
        const possibleExpectedErrorMessage = boundViolationMessage(
            data,
            comparator,
            limit,
            undefined,
            data
        )
        if (data > limit && !comparator.includes(">")) {
            return possibleExpectedErrorMessage
        } else if (data < limit && !comparator.includes("<")) {
            return possibleExpectedErrorMessage
        } else if (data === limit && !comparator.includes("=")) {
            return possibleExpectedErrorMessage
        }
    }
}

const assertCheckResult = (
    t: DynamicType,
    expectedBounds: BoundsDefinition,
    data: number
) => {
    const actualError = t.check(data).errors
    assert(actualError?.summary).equals(
        expectedCheckResult(expectedBounds, data)
    )
}

export const assertCheckResults = (
    t: DynamicType,
    expectedBounds: BoundsDefinition
) => {
    for (const bound of expectedBounds) {
        assertCheckResult(t, expectedBounds, bound[1] - 1)
        assertCheckResult(t, expectedBounds, bound[1])
        assertCheckResult(t, expectedBounds, bound[1] + 1)
    }
}
