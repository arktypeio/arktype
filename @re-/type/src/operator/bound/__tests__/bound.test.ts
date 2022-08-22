import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../index.js"

describe("bound", () => {
    describe("type", () => {
        test("single-bounded", () => {
            assert(type("string>5").infer).typed as string
        })
        test("double-bounded", () => {
            assert(type("-7<=integer<99").infer).typed as number
        })
        test("single-bounded list", () => {
            assert(type("object[]==1").infer).typed as object[]
        })
        test("double-bounded list", () => {
            assert(type("-7<=unknown[]<99").infer).typed as unknown[]
        })
        test("parenthesized list", () => {
            assert(type("-7<=(string|number[]|boolean[][])[]<99").infer)
                .typed as (string | number[] | boolean[][])[]
        })
        describe("errors", () => {
            test("invalid single bound", () => {
                // @ts-expect-error
                assert(() => type("number<integer")).throwsAndHasTypeError(
                    "Right side of < must be a number literal (got 'integer')."
                )
            })
            test("invalid right bound", () => {
                // @ts-expect-error
                assert(() => type("1<number<string")).throwsAndHasTypeError(
                    "Right side of < must be a number literal (got 'string')."
                )
            })
            test("single-bounded unboundable", () => {
                // @ts-expect-error
                assert(() => type("object==999")).throwsAndHasTypeError(
                    "Bounded expression 'object' must be a number-or-string-typed keyword or a list-typed expression."
                )
            })
            test("double-bounded unboundable", () => {
                // @ts-expect-error
                assert(() => type("1<5<999")).throwsAndHasTypeError(
                    "Bounded expression '5' must be a number-or-string-typed keyword or a list-typed expression."
                )
            })
            test("extra left bounds", () => {
                // @ts-expect-error
                assert(() => type("1<5<number<10")).throwsAndHasTypeError(
                    "Right side of < must be a number literal (got 'number')."
                )
            })
            test("multiple-right", () => {
                // @ts-expect-error
                assert(() => type("number<=5<999")).throwsAndHasTypeError(
                    "Definitions cannot have multiple right bounds."
                )
            })
            test("single equals", () => {
                // @ts-expect-error
                assert(() => type("1=number")).throwsAndHasTypeError(
                    "= is not a valid comparator. Use == instead."
                )
            })
        })
    })
    describe("validation", () => {
        describe("boundables", () => {
            describe("string", () => {
                describe("valid", () => {
                    test("single-bounded", () => {
                        assert(
                            type("string>4").validate(
                                "longerThanFourCharacters"
                            ).error
                        ).is(undefined)
                    })
                    test("double-bounded", () => {
                        assert(
                            type("-999<string<=4").validate("four").error
                                ?.message
                        ).snap(undefined)
                    })
                })

                describe("invalid", () => {
                    test("single-bounded", () => {
                        assert(
                            type("string==1").validate("").error?.message
                        ).snap(`[object Object]`)
                    })
                })
            })
            describe("list", () => {
                describe("valid", () => {
                    test("single-bounded", () => {
                        assert(
                            type("any[]>=3").validate([
                                1,
                                "two",
                                { three: 3 },
                                4,
                                5
                            ]).error
                        ).is(undefined)
                        assert(
                            type("boolean[][]<4").validate([
                                [true, false, true],
                                [true],
                                []
                            ]).error
                        ).is(undefined)
                    })
                    test("double-bounded", () => {
                        assert(
                            type("5<number[]<=10").validate([1, 2, 3, 4, 5, 6])
                                .error?.message
                        ).snap(undefined)
                    })
                })
                describe("invalid", () => {
                    test("single-bounded", () => {
                        assert(
                            type("any[]==1").validate([1, "foo"]).error?.message
                        ).snap(`[object Object]`)
                    })
                    test("bad inner type", () => {
                        assert(
                            type("never[]==1").validate([1]).error?.message
                        ).snap(`At index 0, 1 is not assignable to never.`)
                    })
                    test("bad inner type and length", () => {
                        assert(
                            type("0<never[]<2").validate([1, 2]).error?.message
                        ).snap(`Encountered errors at the following paths:
  0: 1 is not assignable to never.
  1: 2 is not assignable to never.
`)
                    })
                })
            })
            describe("numeric", () => {
                describe("edge cases", () => {
                    test("NaN", () => {
                        assert(
                            type("number>=10").validate(Number.NaN).error
                                ?.message
                        ).snap(`[object Object]`)
                        assert(
                            type("number<=10").validate(Number.NaN).error
                                ?.message
                        ).snap(`[object Object]`)
                    })
                    test("infinity", () => {
                        assert(type("number>10").validate(Infinity).error).snap(
                            undefined
                        )
                        assert(
                            type("number>10").validate(-Infinity).error?.message
                        ).snap(`[object Object]`)
                    })
                })
                describe("valid", () => {
                    test("single-bounded", () => {
                        test("<=", () => {
                            assert(type("number<=-5").validate(-5).error).is(
                                undefined
                            )
                            assert(type("number<=-5").validate(-1000).error).is(
                                undefined
                            )
                        })
                        test(">=", () => {
                            assert(type("number>=5").validate(5).error).is(
                                undefined
                            )
                            assert(type("number>=5").validate(9999).error).is(
                                undefined
                            )
                        })
                        test("<", () => {
                            assert(
                                type("number<-999").validate(-1000).error
                            ).is(undefined)
                        })
                        test(">", () => {
                            assert(type("number>5").validate(7).error).is(
                                undefined
                            )
                        })
                        test("==", () => {
                            assert(
                                type("number==5").validate(-5).error?.message
                            ).snap(`Must be 5 (got -5).`)
                        })
                    })
                    describe("double-bounded", () => {
                        test("<", () => {
                            assert(type("5<number<10").validate(7).error).is(
                                undefined
                            )
                        })
                        test("<=", () => {
                            assert(
                                type("5<=number<=9999").validate(5).error
                            ).is(undefined)
                        })
                    })
                })
                // TODO: Why are these passing?
                describe("invalid", () => {
                    describe("single-bounded", () => {
                        test("<=", () => {
                            assert(
                                type("number<=5").validate(7).error?.message
                            ).snap(`[object Object]`)
                        })
                        test(">=", () => {
                            assert(
                                type("number>=-999").validate(-1000).error
                                    ?.message
                            ).snap(`[object Object]`)
                        })
                        test("<", () => {
                            assert(
                                type("number<5").validate(5).error?.message
                            ).snap(`[object Object]`)
                            assert(
                                type("number<5").validate(9999).error?.message
                            ).snap(`[object Object]`)
                        })
                        test(">", () => {
                            assert(
                                type("number>-5").validate(-5).error?.message
                            ).snap(`[object Object]`)
                            assert(
                                type("number>-5").validate(-1000).error?.message
                            ).snap(`[object Object]`)
                        })
                        test("==", () => {
                            assert(
                                type("number==5").validate(-5).error?.message
                            ).snap(`[object Object]`)
                        })
                    })
                    describe("double-bounded", () => {
                        test("<", () => {
                            assert(
                                type("5<number<10").validate(-9).error?.message
                            ).snap(`Must be greater than 5 (got -9).`)
                            assert(
                                type("5<number<10").validate(99).error?.message
                            ).snap(`Must be less than 10 (got 99).`)
                        })
                        test("<=", () => {
                            assert(
                                type("5<=number<=9999").validate(4).error
                                    ?.message
                            ).snap(
                                `Must be greater than or equal to 5 (got 4).`
                            )
                            assert(
                                type("5<=number<=9999").validate(10000).error
                                    ?.message
                            ).snap()
                        })
                        test("<= + <", () => {
                            assert(
                                type("5<=number<9999").validate(9999).error
                                    ?.message
                            ).snap(`Must be less than 9999 (got 9999).`)
                        })
                    })
                })
            })
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
