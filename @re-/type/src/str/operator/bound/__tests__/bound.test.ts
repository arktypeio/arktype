import { assert } from "@re-/assert"
import * as fc from "fast-check"
import { describe, test } from "mocha"
import { dynamic, type } from "../../../../index.js"
import {
    BoundViolationDiagnostic,
    DoubleBoundDefinition,
    SingleBoundDefinition
} from "../bound.js"
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
                assert(type("number>0").tree).narrowedValue([
                    "number",
                    [">", 0]
                ])
            })
            test("<", () => {
                assert(type("number<10").tree).narrowedValue([
                    "number",
                    ["<", 10]
                ])
            })
            test(">=", () => {
                assert(type("number>=3.14159").tree).narrowedValue([
                    "number",
                    [">=", 3.14159]
                ])
            })
            test("<=", () => {
                assert(type("number<=-49").tree).narrowedValue([
                    "number",
                    ["<=", -49]
                ])
            })
            test("==", () => {
                assert(type("number==3211993").tree).narrowedValue([
                    "number",
                    ["==", 3211993]
                ])
            })
        })
        describe("double", () => {
            test("<,<=", () => {
                assert(type("-5<number<=5").tree).narrowedValue([
                    "number",
                    [">", -5],
                    ["<=", 5]
                ])
            })
            test("<=,<", () => {
                assert(type("-3.23<=number<4.654").tree).narrowedValue([
                    "number",
                    [">=", -3.23],
                    ["<", 4.654]
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
                        const expectedBounds: SingleBoundDefinition = [
                            [comparator, limit]
                        ]
                        assert(singleBound.tree).equals([
                            "number",
                            ...expectedBounds
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
                        const expectedBounds: DoubleBoundDefinition = [
                            [invertedComparators[lowerComparator], lowerLimit],
                            [upperComparator, upperLimit]
                        ]
                        assert(doubleBound.tree).equals([
                            "number",
                            ...expectedBounds
                        ])
                        assertCheckResults(doubleBound, expectedBounds)
                    }
                )
            )
        })
    })

    describe("string", () => {
        test("parse", () => {
            assert(type("1<string<=5").tree).narrowedValue([
                "string",
                [">", 1],
                ["<=", 5]
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
                    type: `string>=3`,
                    data: `no`,
                    comparator: `>=`,
                    limit: 3,
                    size: 2,
                    units: `characters`,
                    message: `"no" must be greater than or equal to 3 characters (was 2).`,
                    options: undefined
                }
            ])
        })
    })

    describe("list", () => {
        test("parse", () => {
            assert(type("-343<=boolean[]<89").tree).narrowedValue([
                ["boolean", "[]"],
                [">=", -343],
                ["<", 89]
            ])
        })
        test("check", () => {
            const twoNulls = type("null[]==2")
            assert(twoNulls.check([null, null]).errors).equals(undefined)
            assert(twoNulls.check([null]).errors?.summary).snap(
                `[null] must be exactly 2 items (was 1).`
            )
        })
    })

    describe("generation", () => {
        test("unsupported", () => {
            assert(() => type("1<number<5").create()).throws.snap(
                `Error: Unable to generate a value for '1<number<5': Bound generation is unsupported.`
            )
        })
    })
})
