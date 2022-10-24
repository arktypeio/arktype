import { attest } from "@arktype/test"
import * as fc from "fast-check"
import { describe, test } from "mocha"
import { type } from "../../../../api.js"
import { Bound } from "../bound.js"
import type { ExpectedBounds } from "./utils.js"
import {
    arbitraryComparator,
    arbitraryDoubleComparator,
    arbitraryLimit,
    assertCheckResults
} from "./utils.js"

// TODO: Add subtype tests for bounds and divisibility
describe("bound", () => {
    describe("check", () => {
        test("single", () => {
            fc.attest(
                fc.property(
                    arbitraryComparator,
                    arbitraryLimit,
                    (comparator, limit) => {
                        const singleBound = type.dynamic(
                            `number${comparator}${limit}`
                        )
                        attest(singleBound.ast).equals([
                            "number",
                            comparator,
                            String(limit)
                        ])
                        assertCheckResults(singleBound, [[comparator, limit]])
                    }
                )
            )
        })
        test("double", () => {
            fc.attest(
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
                        attest(doubleBound.ast).equals([
                            String(lowerLimit),
                            lowerComparator,
                            ["number", upperComparator, String(upperLimit)]
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
            attest(gte3.check("yes").problems).equals(undefined)
            attest(gte3.check("no").problems?.summary).snap(
                "Must be at least 3 characters (was 2)"
            )
        })
    })
    describe("array", () => {
        test("check", () => {
            const twoNulls = type("null[]==2")
            attest(twoNulls.check([null, null]).problems).equals(undefined)
            attest(twoNulls.check([null]).problems?.summary).snap(
                `Must be exactly 2 items (was 1)`
            )
        })
    })
})
