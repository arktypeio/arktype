import { assert } from "@re-/assert"
import * as fc from "fast-check"
import { describe, test } from "mocha"
import { dynamic, type } from "../../../../index.js"
import {
    boundValidationError,
    DoubleBoundDefinition,
    SingleBoundDefinition
} from "../bound.js"
import { invertedComparators } from "../common.js"
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
                assert(type("number>0").tree).typedValue(["number", [">", 0]])
            })
            test("<", () => {
                assert(type("number<10").tree).typedValue(["number", ["<", 10]])
            })
            test(">=", () => {
                assert(type("number>=3.14159").tree).typedValue([
                    "number",
                    [">=", 3.14159]
                ])
            })
            test("<=", () => {
                assert(type("number<=-49").tree).typedValue([
                    "number",
                    ["<=", -49]
                ])
            })
            test("==", () => {
                assert(type("number==3211993").tree).typedValue([
                    "number",
                    ["==", 3211993]
                ])
            })
        })
        describe("double", () => {
            test("<,<=", () => {
                assert(type("-5<number<=5").tree).typedValue([
                    "number",
                    [">", -5],
                    ["<=", 5]
                ])
            })
            test("<=,<", () => {
                assert(type("-3.23<=number<4.654").tree).typedValue([
                    "number",
                    [">=", -3.23],
                    ["<", 4.654]
                ])
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
            assert(type("1<string<=5").tree).typedValue([
                "string",
                [">", 1],
                ["<=", 5]
            ])
        })
        test("check", () => {
            const gte3 = type("string>=3")
            assert(gte3.check("yes").errors).equals(undefined)
            assert(
                gte3.check("no").errors as any as [boundValidationError]
            ).snap([
                {
                    code: `BoundViolation`,
                    path: [],
                    definition: `string>=3`,
                    tree: [`string`, [`>=`, 3]],
                    data: `no`,
                    comparator: `>=`,
                    limit: 3,
                    size: 2,
                    units: `characters`,
                    message: `"no" must be greater than or equal to 3 characters (got 2).`
                }
            ])
        })
    })

    describe("list", () => {
        test("parse", () => {
            assert(type("-343<=boolean[]<89").tree).typedValue([
                ["boolean", "[]"],
                [">=", -343],
                ["<", 89]
            ])
        })
        test("check", () => {
            const twoNulls = type("null[]==2")
            assert(twoNulls.check([null, null]).errors).equals(undefined)
            assert(
                twoNulls.check([null]).errors as any as [boundValidationError]
            ).snap([
                {
                    code: `BoundViolation`,
                    path: [],
                    definition: `null[]==2`,
                    tree: [
                        [`null`, `[]`],
                        [`==`, 2]
                    ],
                    data: [null],
                    comparator: `==`,
                    limit: 2,
                    size: 1,
                    units: `items`,
                    message: `[null] must be exactly 2 items (got 1).`
                }
            ])
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
