import { assert } from "@re-/assert"
import * as fc from "fast-check"
import {
    comparators,
    doubleBoundComparators
} from "../../../../parser/str/operator/unary/comparator/common.js"
import type {
    Comparator,
    DoubleBoundComparator
} from "../../../../parser/str/operator/unary/comparator/common.js"
import type { DynamicTypeRoot } from "../../../../scopes/type.js"
import { keywordNodes } from "../../../terminals/keywords/keyword.js"
import { numberTypedKeywords } from "../../../terminals/keywords/number.js"
import { stringTypedKeywords } from "../../../terminals/keywords/string.js"
import type { BoundsAst } from "../bounds.js"
import { boundToString } from "../bounds.js"

const keysOf = (o: object) => Object.keys(o)

export const arbitraryKeywordList = fc.constantFrom(
    ...keysOf(keywordNodes).map((_) => `${_}[]`)
)
export const arbitraryNumberKeyword = fc.constantFrom(
    ...keysOf(numberTypedKeywords)
)
export const arbitraryStringKeyword = fc.constantFrom(
    ...keysOf(stringTypedKeywords)
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
    expectedBounds: BoundsAst.Constraints,
    data: number
) => {
    for (const [comparator, limit] of expectedBounds) {
        const reason = boundToString(comparator, limit, "number")
        const expectedMessageIfOutOfBound = `${reason} (was ${data})`
        if (data > limit && !comparator.includes(">")) {
            return expectedMessageIfOutOfBound
        } else if (data < limit && !comparator.includes("<")) {
            return expectedMessageIfOutOfBound
        } else if (data === limit && !comparator.includes("=")) {
            return expectedMessageIfOutOfBound
        }
    }
}

const assertCheckResult = (
    t: DynamicTypeRoot,
    expectedBounds: BoundsAst.Constraints,
    data: number
) => {
    const actualErrors = t.check(data).errors
    assert(actualErrors?.summary).equals(
        expectedCheckResult(expectedBounds, data)
    )
}

export const assertCheckResults = (
    t: DynamicTypeRoot,
    expectedBounds: BoundsAst.Constraints
) => {
    for (const bound of expectedBounds) {
        assertCheckResult(t, expectedBounds, bound[1] - 1)
        assertCheckResult(t, expectedBounds, bound[1])
        assertCheckResult(t, expectedBounds, bound[1] + 1)
    }
}
