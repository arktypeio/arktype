import { assert } from "@re-/assert"
import * as fc from "fast-check"
import {
    Bounds,
    boundViolationMessage
} from "../../../../nodes/constraints/bounds.js"
import { Keyword } from "../../../../nodes/terminal/keywords/keyword.js"
import { numberKeywords } from "../../../../nodes/terminal/keywords/number.js"
import { stringKeywords } from "../../../../nodes/terminal/keywords/string.js"
import { DynamicType } from "../../../../type.js"
import { Scanner, scanner } from "../../../state/scanner.js"
import { DoubleBoundComparator, doubleBoundComparators } from "../common.js"

const keysOf = (o: object) => Object.keys(o)

export const arbitraryKeywordList = fc.constantFrom(
    ...keysOf(Keyword.nodes).map((_) => `${_}[]`)
)
export const arbitraryNumberKeyword = fc.constantFrom(...keysOf(numberKeywords))
export const arbitraryStringKeyword = fc.constantFrom(...keysOf(stringKeywords))

export const aribtraryBoundable = fc.oneof(
    arbitraryNumberKeyword,
    arbitraryStringKeyword,
    arbitraryKeywordList
)
export const arbitraryComparator = fc.constantFrom(
    ...(Object.keys(scanner.comparators) as Scanner.Comparator[])
)
export const arbitraryDoubleComparator = fc.constantFrom(
    ...(Object.keys(doubleBoundComparators) as DoubleBoundComparator[])
)

const boundRange = { min: -1000, max: 1000, noNaN: true }

export const arbitraryLimit = fc
    .oneof(fc.float(boundRange), fc.integer(boundRange))
    .map((limit) => Number.parseFloat(limit.toFixed(2)))

const expectedCheckResult = (expectedBounds: Bounds, data: number) => {
    for (const [comparator, limit] of expectedBounds) {
        const possibleExpectedErrorMessage = boundViolationMessage(
            comparator,
            limit,
            data,
            "number"
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
    expectedBounds: Bounds,
    data: number
) => {
    const actualErrors = t.check(data).errors
    assert(actualErrors?.summary).equals(
        expectedCheckResult(expectedBounds, data)
    )
}

export const assertCheckResults = (t: DynamicType, expectedBounds: Bounds) => {
    for (const bound of expectedBounds) {
        assertCheckResult(t, expectedBounds, bound[1] - 1)
        assertCheckResult(t, expectedBounds, bound[1])
        assertCheckResult(t, expectedBounds, bound[1] + 1)
    }
}
