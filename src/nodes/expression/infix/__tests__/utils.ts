import { assert } from "#testing"
import * as fc from "fast-check"
import type { Arktype } from "../../../../type.js"
import { Keyword } from "../../../terminal/keyword/keyword.js"
import { NumericKeyword } from "../../../terminal/keyword/numeric.js"
import { RegexKeyword } from "../../../terminal/keyword/regex.js"
import { Bound } from "../bound.js"

const keysOf = (o: object) => Object.keys(o)

export const arbitraryKeywordList = fc.constantFrom(
    ...keysOf(Keyword.nodes).map((_) => `${_}[]`)
)
export const arbitraryNumberKeyword = fc.constantFrom([
    "number",
    ...keysOf(NumericKeyword.nodes)
])
export const arbitraryStringKeyword = fc.constantFrom([
    "string",
    ...keysOf(RegexKeyword.nodes)
])

export const aribtraryBoundable = fc.oneof(
    arbitraryNumberKeyword,
    arbitraryStringKeyword,
    arbitraryKeywordList
)
export const arbitraryComparator = fc.constantFrom(
    ...(Object.keys(Bound.tokens) as Bound.Token[])
)
export const arbitraryDoubleComparator = fc.constantFrom(
    ...(Object.keys(Bound.doublableTokens) as Bound.DoublableToken[])
)

const boundRange = { min: -1000, max: 1000, noNaN: true }

export const arbitraryLimit = fc
    .oneof(fc.float(boundRange), fc.integer(boundRange))
    .map((limit) => Number.parseFloat(limit.toFixed(2)))

export type ExpectedBounds = [Bound.Token, number][]

const expectedCheckResult = (expectedBounds: ExpectedBounds, data: number) => {
    for (const [comparator, limit] of expectedBounds) {
        const reason = "" //Bound.describe(comparator, limit, "number")
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
    t: Arktype,
    expectedBounds: [Bound.Token, number][],
    data: number
) => {
    const actualErrors = t.check(data).problems
    assert(actualErrors?.summary).equals(
        expectedCheckResult(expectedBounds, data)
    )
}

export const assertCheckResults = (
    t: Arktype,
    expectedBounds: [Bound.Token, number][]
) => {
    for (const bound of expectedBounds) {
        assertCheckResult(t, expectedBounds, bound[1] - 1)
        assertCheckResult(t, expectedBounds, bound[1])
        assertCheckResult(t, expectedBounds, bound[1] + 1)
    }
}
