import { assert } from "@re-/assert"
import * as fc from "fast-check"
import type { DoubleBoundComparator } from "../../../parser/str/operator/unary/bound/common.js"
import { doubleBoundComparators } from "../../../parser/str/operator/unary/bound/common.js"
import type { Scanner } from "../../../parser/str/state/scanner.js"
import { scanner } from "../../../parser/str/state/scanner.js"
import type { DynamicType } from "../../../type.js"
import { keywordNodes } from "../../terminals/keywords/keyword.js"
import { numberTypedKeywords } from "../../terminals/keywords/number.js"
import { stringTypedKeywords } from "../../terminals/keywords/string.js"
import type { Bounds } from "../bounds.js"
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
    ...(Object.keys(scanner.comparators) as Scanner.Comparator[])
)
export const arbitraryDoubleComparator = fc.constantFrom(
    ...(Object.keys(doubleBoundComparators) as DoubleBoundComparator[])
)

const boundRange = { min: -1000, max: 1000, noNaN: true }

export const arbitraryLimit = fc
    .oneof(fc.float(boundRange), fc.integer(boundRange))
    .map((limit) => Number.parseFloat(limit.toFixed(2)))

const expectedCheckResult = (expectedBounds: Bounds.Ast, data: number) => {
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
    t: DynamicType,
    expectedBounds: Bounds.Ast,
    data: number
) => {
    const actualErrors = t.check(data).errors
    assert(actualErrors?.summary).equals(
        expectedCheckResult(expectedBounds, data)
    )
}

export const assertCheckResults = (
    t: DynamicType,
    expectedBounds: Bounds.Ast
) => {
    for (const bound of expectedBounds) {
        assertCheckResult(t, expectedBounds, bound[1] - 1)
        assertCheckResult(t, expectedBounds, bound[1])
        assertCheckResult(t, expectedBounds, bound[1] + 1)
    }
}
