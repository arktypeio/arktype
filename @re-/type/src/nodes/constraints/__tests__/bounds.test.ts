import { assert } from "@re-/assert"
import * as fc from "fast-check"
import { describe, test } from "mocha"
import { dynamic, type } from "../../../index.js"
import type { Allows } from "../../../nodes/allows.js"
import type { Bounds } from "../../../nodes/constraints/bounds.js"
import { invertedComparators } from "../../../parser/str/operator/bound/common.js"
import {
    arbitraryComparator,
    arbitraryDoubleComparator,
    arbitraryLimit,
    assertCheckResults
} from "./common.js"

describe("bound", () => {
    describe("check", () => {
        test("single", () => {
            fc.assert(
                fc.property(
                    arbitraryComparator,
                    arbitraryLimit,
                    (comparator, limit) => {
                        const singleBound = dynamic(
                            `number${comparator}${limit}`
                        )
                        const expectedBounds: Bounds.Ast = [[comparator, limit]]
                        assert(singleBound.ast).equals([
                            "number",
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
                        const doubleBound = dynamic(
                            `${lowerLimit}${lowerComparator}number${upperComparator}${upperLimit}`
                        )
                        const expectedBounds: Bounds.Ast = [
                            [invertedComparators[lowerComparator], lowerLimit],
                            [upperComparator, upperLimit]
                        ]
                        assert(doubleBound.ast).equals([
                            "number",
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
                gte3.check("no").errors as any as Allows.Diagnostic<"bound">[]
            ).snap([
                {
                    code: `bound`,
                    message: `Must be at least 3 characters`,
                    path: [],
                    options: {},
                    context: {
                        data: `no`,
                        comparator: `>=`,
                        limit: 3,
                        actual: 2,
                        kind: `string`
                    }
                }
            ])
        })
    })

    describe("list", () => {
        test("check", () => {
            const twoNulls = type("null[]==2")
            assert(twoNulls.check([null, null]).errors).equals(undefined)
            assert(twoNulls.check([null]).errors?.summary).snap(
                `Must be exactly 2 items.`
            )
        })
    })

    describe("generation", () => {
        test("unsupported", () => {
            assert(() => type("1<number<5").create()).throws.snap(
                `Error: Unable to generate a value for '1<number<5': Constrained generation is not yet supported.`
            )
        })
    })
})
