import { assert } from "@re-/assert"
import * as fc from "fast-check"
import { describe, test } from "mocha"
import { type } from "../../../type.js"
import type { Diagnostic } from "../../traverse/diagnostics.js"
import { Bound } from "../infix/bound.js"
import type { ExpectedBounds } from "./utils.js"
import {
    arbitraryComparator,
    arbitraryDoubleComparator,
    arbitraryLimit,
    assertCheckResults
} from "./utils.js"

describe("bound", () => {
    describe("check", () => {
        test("single", () => {
            fc.assert(
                fc.property(
                    arbitraryComparator,
                    arbitraryLimit,
                    (comparator, limit) => {
                        const singleBound = type.dynamic(
                            `number${comparator}${limit}`
                        )
                        const expectedBounds: ExpectedBounds = [
                            [comparator, limit]
                        ]
                        assert(singleBound.ast).equals([
                            "number",
                            ":",
                            expectedBounds
                        ])
                        assertCheckResults(singleBound, expectedBounds)
                    }
                )
            )
        })
        test("double", () => {
            fc.assert(
                fc.property(
                    arbitraryLimit,
                    arbitraryDoubleComparator,
                    arbitraryDoubleComparator,
                    arbitraryLimit,
                    (
                        lowerLimit,
                        lowerComparator,
                        upperComparator,
                        upperLimit
                    ) => {
                        const doubleBound = type.dynamic(
                            `${lowerLimit}${lowerComparator}number${upperComparator}${upperLimit}`
                        )
                        const expectedBounds: ExpectedBounds = [
                            [
                                Bound.invertedComparators[lowerComparator],
                                lowerLimit
                            ],
                            [upperComparator, upperLimit]
                        ]
                        assert(doubleBound.ast).equals([
                            "number",
                            ":",
                            expectedBounds
                        ])
                        assertCheckResults(doubleBound, expectedBounds)
                    }
                )
            )
        })
    })
    describe("string", () => {
        test("check", () => {
            const gte3 = type("string>=3")
            assert(gte3.check("yes").errors).equals(undefined)
            assert(
                gte3.check("no").errors as any as Diagnostic<"bound">[]
            ).snap([
                {
                    type: {
                        left: { def: "string", hasStructure: false },
                        token: ">=",
                        right: { def: "3", hasStructure: false, value: 3 },
                        hasStructure: false
                    },
                    message: "Must be at least 3 characters (was 2)",
                    comparator: ">=",
                    comparatorDescription: "at least",
                    limit: 3,
                    actual: 2,
                    kind: "string",
                    data: { raw: "no", toString: "<function toString>" },
                    path: []
                }
            ])
        })
    })
    describe("array", () => {
        test("check", () => {
            const twoNulls = type("null[]==2")
            assert(twoNulls.check([null, null]).errors).equals(undefined)
            assert(twoNulls.check([null]).errors?.summary).snap(
                `Must be exactly 2 items (was 1)`
            )
        })
    })
})
