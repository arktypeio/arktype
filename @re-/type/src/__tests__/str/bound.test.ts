import { assert } from "@re-/assert"
import { describe, test } from "vitest"
import { type } from "../../index.js"

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
            assert(type("-7>=unknown[]>99").infer).typed as unknown[]
        })
        test("parenthesized list", () => {
            assert(type("-7<=(string|number[]|boolean[][])[]<99").infer)
                .typed as (string | number[] | boolean[][])[]
        })
        describe("errors", () => {
            test("invalid single bound", () => {
                // @ts-expect-error
                assert(() => type("number<integer")).throwsAndHasTypeError(
                    "Bounding value 'integer' must be a number literal."
                )
            })
            test("invalid left bound", () => {
                // @ts-expect-error
                assert(() => type("null<number<5")).throwsAndHasTypeError(
                    "Bounding value 'null' must be a number literal."
                )
            })
            test("invalid right bound", () => {
                // @ts-expect-error
                assert(() => type("1<number<string")).throwsAndHasTypeError(
                    "Bounding value 'string' must be a number literal."
                )
            })
            test("two invalid bounds", () => {
                assert(() =>
                    // @ts-expect-error
                    type("number<number<number")
                ).throwsAndHasTypeError(
                    "Bounding value 'number' must be a number literal."
                )
            })
            test("single-bounded unboundable", () => {
                // @ts-expect-error
                assert(() => type("object==999")).throwsAndHasTypeError(
                    "Definition 'object' is not boundable."
                )
            })
            test("double-bounded unboundable", () => {
                // @ts-expect-error
                assert(() => type("1<5<999")).throwsAndHasTypeError(
                    "Definition '5' is not boundable."
                )
            })
            test("left-only bounds", () => {
                // @ts-expect-error
                assert(() => type("1>5>number[]")).throwsAndHasTypeError(
                    "Left side of comparator > cannot be bounded more than once."
                )
            })
            test("extra left bounds", () => {
                // @ts-expect-error
                assert(() => type("1<5<number<10")).throwsAndHasTypeError(
                    "Left side of comparator < cannot be bounded more than once."
                )
            })
            test("right-only bounds", () => {
                // @ts-expect-error
                assert(() => type("number>=5>999")).throwsAndHasTypeError(
                    "Right side of comparator > cannot be bounded more than once."
                )
            })
            test("extra right bounds", () => {
                // @ts-expect-error
                assert(() => type("1<number<999<1000")).throwsAndHasTypeError(
                    "Right side of comparator < cannot be bounded more than once."
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
                        ).snap()
                    })
                    test("double-bounded", () => {
                        assert(
                            type("999>string>100").validate("tooShort").error
                                ?.message
                        ).snap()
                    })
                })
            })
            describe("list", () => {
                describe("valid", () => {
                    test("single-bounded", () => {
                        assert(
                            type("3<any[]").validate([
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
                            type("any[]==1").validate([1, "foo"]).error
                        ).snap()
                    })
                    test("double-bounded with equality", () => {
                        const impossible = type("1==(boolean|number)[]==2")
                        assert(impossible).typed as (number | boolean)[]
                        assert(impossible.validate([]).error?.message).snap()
                    })
                    test("bad inner type", () => {
                        assert(
                            type("never[]==1").validate([1]).error?.message
                        ).snap(`At index 0, 1 is not assignable to never.`)
                    })
                    test("bad inner type and length", () => {
                        assert(
                            type("0<never[]<2").validate([1, 2]).error?.message
                        ).snap()
                    })
                })
            })
            describe("numeric", () => {
                describe("edge cases", () => {
                    test("NaN", () => {
                        assert(
                            type("number>=10").validate(Number.NaN).error
                                ?.message
                        ).equals("TODO")
                        assert(
                            type("number<=10").validate(Number.NaN).error
                                ?.message
                        ).equals("TODO")
                    })
                    test("infinity", () => {
                        assert(
                            type("number>10").validate(Infinity).error
                        ).equals(undefined)
                        assert(
                            type("number>10").validate(-Infinity).error?.message
                        ).equals("TODO")
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
                        test(">", () => {
                            assert(
                                type("7>number>-2000").validate(-1000).error
                            ).is(undefined)
                        })
                        test("<=", () => {
                            assert(
                                type("5<=number<=9999").validate(5).error
                            ).is(undefined)
                        })
                        test(">=", () => {
                            assert(
                                type("10>=number>=-10").validate(0).error
                            ).is(undefined)
                        })
                        // Double-bounding with == is pointless but is technically valid syntax
                        test("==", () => {
                            assert(
                                type("1==number==1").validate(1).error
                            ).equals(undefined)
                        })
                    })
                })
                describe("invalid", () => {
                    test("single-bounded", () => {
                        test("<=", () => {
                            assert(
                                type("number<=5").validate(7).error?.message
                            ).snap(`Must be less than or equal to 5 (got 7).`)
                        })
                        test(">=", () => {
                            assert(
                                type("number>=-999").validate(-1000).error
                                    ?.message
                            ).snap(
                                `Must be greater than or equal to -999 (got -1000).`
                            )
                        })
                        test("<", () => {
                            assert(
                                type("number<5").validate(5).error?.message
                            ).snap(`Must be less than 5 (got 5).`)
                            assert(
                                type("number<5").validate(9999).error?.message
                            ).snap(`Must be less than 5 (got 9999).`)
                        })
                        test(">", () => {
                            assert(
                                type("number>-5").validate(-5).error?.message
                            ).snap(`Must be greater than -5 (got -5).`)
                            assert(
                                type("number>-5").validate(-1000).error?.message
                            ).snap(`Must be greater than -5 (got -1000).`)
                        })
                        test("==", () => {
                            assert(
                                type("number==5").validate(-5).error?.message
                            ).snap(`Must be 5 (got -5).`)
                        })
                    })
                    test("double-bounded", () => {
                        test("<", () => {
                            assert(
                                type("5<number<10").validate(-9).error?.message
                            ).snap(`Must be greater than 5 (got -9).`)
                            assert(
                                type("5<number<10").validate(99).error?.message
                            ).snap(`Must be less than 10 (got 99).`)
                        })
                        test(">", () => {
                            assert(
                                type("7>number>-2000").validate(-3000).error
                                    ?.message
                            ).snap(`Must be greater than -2000 (got -3000).`)
                            assert(
                                type("7>number>-2000").validate(3000).error
                                    ?.message
                            ).snap(`Must be less than 7 (got 3000).`)
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
                        test(">=", () => {
                            assert(
                                type("-5>=number>=-1000").validate(0).error
                                    ?.message
                            ).snap(`Must be less than or equal to -5 (got 0).`)
                            assert(
                                type("-5>=number>=-1000").validate(-1001).error
                                    ?.message
                            ).snap(
                                `Must be greater than or equal to -1000 (got -1001).`
                            )
                        })
                        test("==", () => {
                            assert(
                                type("1==number==2").validate(1).error?.message
                            ).snap()
                        })
                        test("<= + <", () => {
                            assert(
                                type("5<=number<9999").validate(9999).error
                                    ?.message
                            ).snap(`Must be less than 9999 (got 9999).`)
                        })
                        test("> + >=", () => {
                            assert(
                                type("5>number>=0").validate(5).error?.message
                            ).snap(`Must be less than 5 (got 5).`)
                        })
                    })
                })
            })
        })
    })
    describe("generation", () => {
        test("unsupported", () => {
            assert(() => type("1<number<5").create()).throws.snap(
                `Error: Unable to generate a value for '1<number<5': Constraint generation is unsupported.`
            )
        })
    })
})
