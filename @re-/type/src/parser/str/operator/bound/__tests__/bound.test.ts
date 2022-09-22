import { assert } from "@re-/assert"
import * as fc from "fast-check"
import { describe, test } from "mocha"
import { dynamic, type } from "../../../../../index.js"
import type {
    Bounds,
    BoundViolationDiagnostic
} from "../../../../../nodes/constraints/bounds.js"
import { invalidDoubleBoundMessage, invertedComparators } from "../common.js"
import { nonPrefixLeftBoundMessage } from "../left.js"
import { singleEqualsMessage } from "../parse.js"
import {
    nonSuffixRightBoundMessage,
    unboundableMessage,
    unpairedLeftBoundMessage
} from "../right.js"
import {
    arbitraryComparator,
    arbitraryDoubleComparator,
    arbitraryLimit,
    assertCheckResults
} from "./common.js"

describe("bound", () => {
    describe("parse", () => {
        describe("single", () => {
            test(">", () => {
                assert(type("number>0").ast).narrowedValue([
                    "number",
                    [[">", 0]]
                ])
            })
            test("<", () => {
                assert(type("number<10").ast).narrowedValue([
                    "number",
                    [["<", 10]]
                ])
            })
            test(">=", () => {
                assert(type("number>=3.14159").ast).narrowedValue([
                    "number",
                    [[">=", 3.14159]]
                ])
            })
            test("<=", () => {
                assert(type("number<=-49").ast).narrowedValue([
                    "number",
                    [["<=", -49]]
                ])
            })
            test("==", () => {
                assert(type("number==3211993").ast).narrowedValue([
                    "number",
                    [["==", 3211993]]
                ])
            })
        })
        describe("double", () => {
            test("<,<=", () => {
                assert(type("-5<number<=5").ast).narrowedValue([
                    "number",
                    [
                        [">", -5],
                        ["<=", 5]
                    ]
                ])
            })
            test("<=,<", () => {
                assert(type("-3.23<=number<4.654").ast).narrowedValue([
                    "number",
                    [
                        [">=", -3.23],
                        ["<", 4.654]
                    ]
                ])
            })
        })
        describe("errors", () => {
            test("non-prefix left bound", () => {
                // @ts-expect-error
                assert(() => type("string|5<number")).throwsAndHasTypeError(
                    nonPrefixLeftBoundMessage(5, "<")
                )
            })
            test("single equals", () => {
                // @ts-expect-error
                assert(() => type("string=5")).throwsAndHasTypeError(
                    singleEqualsMessage
                )
            })
            test("invalid left comparator", () => {
                // @ts-expect-error
                assert(() => type("3>number<5")).throwsAndHasTypeError(
                    invalidDoubleBoundMessage(">")
                )
            })
            test("invalid right double-bound comparator", () => {
                // @ts-expect-error
                assert(() => type("3<number==5")).throwsAndHasTypeError(
                    invalidDoubleBoundMessage("==")
                )
            })
            test("non-suffix right bound", () => {
                // @ts-expect-error
                assert(() => type("3<number<5|string")).throwsAndHasTypeError(
                    nonSuffixRightBoundMessage("<", "5|string")
                )
            })
            test("unpaired left", () => {
                // @ts-expect-error
                assert(() => type("3<number")).throwsAndHasTypeError(
                    unpairedLeftBoundMessage
                )
            })
            test("unboundable", () => {
                // @ts-expect-error
                assert(() => type("object|null>=10")).throwsAndHasTypeError(
                    unboundableMessage("object|null")
                )
            })
        })
    })

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
                        const expectedBounds: Bounds = [[comparator, limit]]
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
                        const expectedBounds: Bounds = [
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
        test("parse", () => {
            assert(type("1<string<=5").ast).narrowedValue([
                "string",
                [
                    [">", 1],
                    ["<=", 5]
                ]
            ])
        })
        test("check", () => {
            const gte3 = type("string>=3")
            assert(gte3.check("yes").errors).equals(undefined)
            assert(
                gte3.check("no").errors as any as BoundViolationDiagnostic[]
            ).snap([
                {
                    code: `BoundViolation`,
                    path: [],
                    data: `no`,
                    options: `<undefined>`,
                    comparator: `>=`,
                    limit: 3,
                    size: 2,
                    kind: `string`,
                    message: `Must be at least 3 characters (was 2).`
                }
            ])
        })
    })

    describe("list", () => {
        test("parse", () => {
            assert(type("-343<=boolean[]<89").ast).narrowedValue([
                ["boolean", "[]"],
                [
                    [">=", -343],
                    ["<", 89]
                ]
            ])
        })
        test("check", () => {
            const twoNulls = type("null[]==2")
            assert(twoNulls.check([null, null]).errors).equals(undefined)
            assert(twoNulls.check([null]).errors?.summary).snap(
                `Must be exactly 2 items (was 1).`
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
