import { assert } from "@re-/assert"
import fc from "fast-check"
import { describe, test } from "mocha"
import { type } from "../../../type.js"
import { unexpectedSuffixMessage } from "../../parser/common.js"
import { indivisibleMessage, moduloByZeroMessage } from "../modulo.js"

// Refer to bounds for how to structure/name tests

/**
 * 1. Valid
 * 2. Non-integer modulo value "throwsAndHasTypeError", also 0
 * 3. "Integration": Check that it works with other suffixes: Double Bound, Optional
 * 4. Go through, and ensure we check each error message we defined for Modulo with "
 * "throwsAndHasTypeError"w
 *
 *
 * Validation:
 * 1. Valid
 * 2. Invalid
 *
 * Generate:
 * Copy bounds "throw ungeneratable error"
 */

describe("modulo", () => {
    describe("Valid", () => {
        describe("IntegerLiteralDefinition", () => {
            test("N%n", () => {
                assert(type("number%2").tree).narrowedValue([
                    "number",
                    [["%", 2]]
                ])
            })
        })
        describe("ModuloValueFollowedByOneCharSuffix", () => {
            test("N%n?", () => {
                assert(type("number%10?").tree).narrowedValue([
                    ["number", [["%", 10]]],
                    "?"
                ])
            })
            test("N%n>", () => {
                assert(type("number%10>2").tree).narrowedValue([
                    "number",
                    [
                        ["%", 10],
                        [">", 2]
                    ]
                ])
            })
            test("N%n<", () => {
                assert(type("number%10>2").tree).narrowedValue([
                    "number",
                    [
                        ["%", 10],
                        [">", 2]
                    ]
                ])
            })
            test("<N%n<", () => {
                assert(type("2<number%10<4").tree).narrowedValue([
                    "number",
                    [
                        ["%", 10],
                        [">", 2],
                        ["<", 4]
                    ]
                ])
            })
        })
        describe("ModuloValueFollowedByTwoCharSuffix", () => {
            test("N%n==", () => {
                assert(type("number%2==0").tree).narrowedValue([
                    "number",
                    [
                        ["%", 2],
                        ["==", 0]
                    ]
                ])
            })
            test("N%n<=", () => {
                assert(type("number%2<=4").tree).narrowedValue([
                    "number",
                    [
                        ["%", 2],
                        ["<=", 4]
                    ]
                ])
            })
            test("N%n>=", () => {
                assert(type("number%2>=4").tree).narrowedValue([
                    "number",
                    [
                        ["%", 2],
                        [">=", 4]
                    ]
                ])
            })
            test("<=N%n<=", () => {
                assert(type("1<=number%2<=4").tree).narrowedValue([
                    "number",
                    [
                        ["%", 2],
                        [">=", 1],
                        ["<=", 4]
                    ]
                ])
            })
        })
    })
    describe("Invalid", () => {
        test("N%0", () => {
            // @ts-expect-error
            assert(() => type("number%0")).throwsAndHasTypeError(
                moduloByZeroMessage
            )
        })
        test("unexpectedSuffix", () => {
            // @ts-expect-error
            assert(() => type("number%foobar")).throwsAndHasTypeError(
                unexpectedSuffixMessage("%", "foobar", "an integer literal")
            )
        })
        test("Indivisible", () => {
            // @ts-expect-error
            assert(() => type("string%2")).throwsAndHasTypeError(
                indivisibleMessage("string")
            )
        })
        test("Non-Integer", () => {
            // @ts-expect-error
            assert(() => type("number%2.3")).throwsAndHasTypeError(
                unexpectedSuffixMessage("%", "a number literal")
            )
        })
    })
    describe("Doing something", () => {
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
                        assert(singleBound.tree).equals([
                            "number",
                            expectedBounds
                        ])
                        assertCheckResults(singleBound, expectedBounds)
                    }
                )
            )
        })
    })
    describe("generation", () => {
        test("unsupported", () => {
            assert(() => type("number%5").create()).throws.snap(
                `Error: Unable to generate a value for 'number%5': Constrained generation is not yet supported.`
            )
        })
    })
})
//

//     describe("check", () => {
//         test("single", () => {
//             fc.assert(
//                 fc.property(
//                     arbitraryComparator,
//                     arbitraryLimit,
//                     (comparator, limit) => {
//                         const singleBound = dynamic(
//                             `number${comparator}${limit}`
//                         )
//                         const expectedBounds: Bounds = [[comparator, limit]]
//                         assert(singleBound.tree).equals([
//                             "number",
//                             expectedBounds
//                         ])
//                         assertCheckResults(singleBound, expectedBounds)
//                     }
//                 )
//             )
//         })
//         test("double", () => {
//             fc.assert(
//                 fc.property(
//                     arbitraryLimit,
//                     arbitraryDoubleComparator,
//                     arbitraryDoubleComparator,
//                     arbitraryLimit,
//                     (
//                         lowerLimit,
//                         lowerComparator,
//                         upperComparator,
//                         upperLimit
//                     ) => {
//                         const doubleBound = dynamic(
//                             `${lowerLimit}${lowerComparator}number${upperComparator}${upperLimit}`
//                         )
//                         const expectedBounds: Bounds = [
//                             [invertedComparators[lowerComparator], lowerLimit],
//                             [upperComparator, upperLimit]
//                         ]
//                         assert(doubleBound.tree).equals([
//                             "number",
//                             expectedBounds
//                         ])
//                         assertCheckResults(doubleBound, expectedBounds)
//                     }
//                 )
//             )
//         })
//     })

//     describe("string", () => {
//         test("parse", () => {
//             assert(type("1<string<=5").tree).narrowedValue([
//                 "string",
//                 [
//                     [">", 1],
//                     ["<=", 5]
//                 ]
//             ])
//         })
//         test("check", () => {
//             const gte3 = type("string>=3")
//             assert(gte3.check("yes").errors).equals(undefined)
//             assert(
//                 gte3.check("no").errors as any as BoundViolationDiagnostic[]
//             ).snap([
//                 {
//                     code: `BoundViolation`,
//                     path: [],
//                     data: `no`,
//                     options: undefined,
//                     comparator: `>=`,
//                     limit: 3,
//                     size: 2,
//                     kind: `string`,
//                     message: `Must be at least 3 characters (got 2).`
//                 }
//             ])
//         })
//     })

//     describe("list", () => {
//         test("parse", () => {
//             assert(type("-343<=boolean[]<89").tree).narrowedValue([
//                 ["boolean", "[]"],
//                 [
//                     [">=", -343],
//                     ["<", 89]
//                 ]
//             ])
//         })
//         test("check", () => {
//             const twoNulls = type("null[]==2")
//             assert(twoNulls.check([null, null]).errors).equals(undefined)
//             assert(twoNulls.check([null]).errors?.summary).snap(
//                 `Must be exactly 2 items (got 1).`
//             )
//         })
//     })

//     describe("generation", () => {
//         test("unsupported", () => {
//             assert(() => type("1<number<5").create()).throws.snap(
//                 `Error: Unable to generate a value for '1<number<5': Constrained generation is not yet supported.`
//             )
//         })
//     })
// })
