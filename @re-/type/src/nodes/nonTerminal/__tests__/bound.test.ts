import { assert } from "@re-/assert"
import * as fc from "fast-check"
import { describe, test } from "mocha"
import { type } from "../../../../api.js"
import { invertedComparators } from "../../../../parser/str/operator/unary/comparator/common.js"
import type { Check } from "../../../traverse/exports.js"
import type { BoundsAst } from "../../infix/constraining/bounds.js"
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
                        const expectedBounds: BoundsAst.Constraints = [
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
                        const expectedBounds: BoundsAst.Constraints = [
                            [invertedComparators[lowerComparator], lowerLimit],
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
                gte3.check("no").errors as any as Check.Diagnostic<"bound">[]
            ).snap([
                {
                    code: `bound`,
                    path: [],
                    context: {
                        comparator: `>=`,
                        comparatorDescription: "at least",
                        limit: 3,
                        kind: `string`,
                        actual: 2,
                        data: `no`
                    },
                    options: {},
                    message: `Must be at least 3 characters (was 2)`
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
