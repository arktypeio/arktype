import { assert } from "@re-/assert"
import { type } from "../../src/index.js"

describe("bound", () => {
    describe("type", () => {
        it("single-bounded", () => {
            assert(type("string>5").infer).typed as string
        })
        it("double-bounded", () => {
            assert(type("-7<=integer<99").infer).typed as number
        })
        it("single-bounded list", () => {
            assert(type("object[]==1").infer).typed as object[]
        })
        it("double-bounded list", () => {
            assert(type("-7>=unknown[]>99").infer).typed as unknown[]
        })
        it("parenthesized list", () => {
            assert(type("-7<=(string|number[]|boolean[][])[]<99").infer)
                .typed as (string | number[] | boolean[][])[]
        })
        describe("errors", () => {
            it("invalid single bound", () => {
                // @ts-expect-error
                assert(() => type("number<integer")).throwsAndHasTypeError(
                    "Bounding value 'integer' must be a number literal."
                )
            })
            it("invalid left bound", () => {
                // @ts-expect-error
                assert(() => type("null<number<5")).throwsAndHasTypeError(
                    "Bounding value 'null' must be a number literal."
                )
            })
            it("invalid right bound", () => {
                // @ts-expect-error
                assert(() => type("1<number<string")).throwsAndHasTypeError(
                    "Bounding value 'string' must be a number literal."
                )
            })
            it("two invalid bounds", () => {
                assert(() =>
                    // @ts-expect-error
                    type("number<number<number")
                ).throwsAndHasTypeError(
                    "Bounding value 'number' must be a number literal."
                )
            })
            it("single-bounded unboundable", () => {
                // @ts-expect-error
                assert(() => type("object==999")).throwsAndHasTypeError(
                    "Definition 'object' is not boundable."
                )
            })
            it("double-bounded unboundable", () => {
                // @ts-expect-error
                assert(() => type("1<5<999")).throwsAndHasTypeError(
                    "Definition '5' is not boundable."
                )
            })
            it("left-only bounds", () => {
                // @ts-expect-error
                assert(() => type("1>5>number[]")).throwsAndHasTypeError(
                    "Left side of comparator > cannot be bounded more than once."
                )
            })
            it("extra left bounds", () => {
                // @ts-expect-error
                assert(() => type("1<5<number<10")).throwsAndHasTypeError(
                    "Left side of comparator < cannot be bounded more than once."
                )
            })
            it("right-only bounds", () => {
                // @ts-expect-error
                assert(() => type("number>=5>999")).throwsAndHasTypeError(
                    "Right side of comparator > cannot be bounded more than once."
                )
            })
            it("extra right bounds", () => {
                // @ts-expect-error
                assert(() => type("1<number<999<1000")).throwsAndHasTypeError(
                    "Right side of comparator < cannot be bounded more than once."
                )
            })
            it("single equals", () => {
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
                    it("single-bounded", () => {
                        assert(
                            type("string>4").validate(
                                "longerThanFourCharacters"
                            ).error
                        ).is(undefined)
                    })
                    it("double-bounded", () => {
                        assert(
                            type("-999<string<=4").validate("four").error
                                ?.message
                        ).snap(undefined)
                    })
                })

                describe("invalid", () => {
                    it("single-bounded", () => {
                        assert(
                            type("string==1").validate("").error?.message
                        ).snap()
                    })
                    it("double-bounded", () => {
                        assert(
                            type("999>string>100").validate("tooShort").error
                                ?.message
                        ).snap()
                    })
                })
            })
            describe("list", () => {
                describe("valid", () => {
                    it("single-bounded", () => {
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
                    it("double-bounded", () => {
                        assert(
                            type("5<number[]<=10").validate([1, 2, 3, 4, 5, 6])
                                .error?.message
                        ).snap(undefined)
                    })
                })
                describe("invalid", () => {
                    it("single-bounded", () => {
                        assert(
                            type("any[]==1").validate([1, "foo"]).error
                        ).snap()
                    })
                    it("double-bounded with equality", () => {
                        const impossible = type("1==(boolean|number)[]==2")
                        assert(impossible).typed as (number | boolean)[]
                        assert(impossible.validate([]).error?.message).snap()
                    })
                    it("bad inner type", () => {
                        assert(
                            type("never[]==1").validate([1]).error?.message
                        ).snap(`At index 0, 1 is not assignable to never.`)
                    })
                    it("bad inner type and length", () => {
                        assert(
                            type("0<never[]<2").validate([1, 2]).error?.message
                        ).snap()
                    })
                })
            })
            describe("numeric", () => {
                describe("edge cases", () => {
                    it("NaN", () => {
                        assert(
                            type("number>=10").validate(Number.NaN).error
                                ?.message
                        ).equals("TODO")
                        assert(
                            type("number<=10").validate(Number.NaN).error
                                ?.message
                        ).equals("TODO")
                    })
                    it("infinity", () => {
                        assert(
                            type("number>10").validate(Infinity).error
                        ).equals(undefined)
                        assert(
                            type("number>10").validate(-Infinity).error?.message
                        ).equals("TODO")
                    })
                })
                describe("valid", () => {
                    it("single-bounded", () => {
                        it("<=", () => {
                            assert(type("number<=-5").validate(-5).error).is(
                                undefined
                            )
                            assert(type("number<=-5").validate(-1000).error).is(
                                undefined
                            )
                        })
                        it(">=", () => {
                            assert(type("number>=5").validate(5).error).is(
                                undefined
                            )
                            assert(type("number>=5").validate(9999).error).is(
                                undefined
                            )
                        })
                        it("<", () => {
                            assert(
                                type("number<-999").validate(-1000).error
                            ).is(undefined)
                        })
                        it(">", () => {
                            assert(type("number>5").validate(7).error).is(
                                undefined
                            )
                        })
                        it("==", () => {
                            assert(
                                type("number==5").validate(-5).error?.message
                            ).snap(`Must be 5 (got -5).`)
                        })
                    })
                    describe("double-bounded", () => {
                        it("<", () => {
                            assert(type("5<number<10").validate(7).error).is(
                                undefined
                            )
                        })
                        it(">", () => {
                            assert(
                                type("7>number>-2000").validate(-1000).error
                            ).is(undefined)
                        })
                        it("<=", () => {
                            assert(
                                type("5<=number<=9999").validate(5).error
                            ).is(undefined)
                        })
                        it(">=", () => {
                            assert(
                                type("10>=number>=-10").validate(0).error
                            ).is(undefined)
                        })
                        // Double-bounding with == is pointless but is technically valid syntax
                        it("==", () => {
                            assert(
                                type("1==number==1").validate(1).error
                            ).equals(undefined)
                        })
                        assert(type("5<=number<9999").validate(9998).error).is(
                            undefined
                        )
                        assert(type("-5>=number>=-1000").validate(-5).error).is(
                            undefined
                        )
                        assert(
                            type("-5>=number>=-1000").validate(-1000).error
                        ).is(undefined)
                    })
                })
                describe("invalid", () => {
                    it("single-bounded", () => {
                        it("<=", () => {
                            assert(
                                type("number<=5").validate(7).error?.message
                            ).snap(`Must be less than or equal to 5 (got 7).`)
                        })
                        it(">=", () => {
                            assert(
                                type("number>=-999").validate(-1000).error
                                    ?.message
                            ).snap(
                                `Must be greater than or equal to -999 (got -1000).`
                            )
                        })
                        it("<", () => {
                            assert(
                                type("number<5").validate(5).error?.message
                            ).snap(`Must be less than 5 (got 5).`)
                            assert(
                                type("number<5").validate(9999).error?.message
                            ).snap(`Must be less than 5 (got 9999).`)
                        })
                        it(">", () => {
                            assert(
                                type("number>-5").validate(-5).error?.message
                            ).snap(`Must be greater than -5 (got -5).`)
                            assert(
                                type("number>-5").validate(-1000).error?.message
                            ).snap(`Must be greater than -5 (got -1000).`)
                        })
                        it("==", () => {
                            assert(
                                type("number==5").validate(-5).error?.message
                            ).snap(`Must be 5 (got -5).`)
                        })
                    })
                    it("double-bounded", () => {
                        it("<", () => {
                            assert(
                                type("5<number<10").validate(-9).error?.message
                            ).snap(`Must be greater than 5 (got -9).`)
                            assert(
                                type("5<number<10").validate(99).error?.message
                            ).snap(`Must be less than 10 (got 99).`)
                        })
                        it(">", () => {
                            assert(
                                type("7>number>-2000").validate(-3000).error
                                    ?.message
                            ).snap(`Must be greater than -2000 (got -3000).`)
                            assert(
                                type("7>number>-2000").validate(3000).error
                                    ?.message
                            ).snap(`Must be less than 7 (got 3000).`)
                        })
                        it("<=", () => {
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
                        it(">=", () => {
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
                        it("==", () => {
                            assert(
                                type("1==number==2").validate(1).error?.message
                            ).snap()
                        })
                        it("<= + <", () => {
                            assert(
                                type("5<=number<9999").validate(9999).error
                                    ?.message
                            ).snap(`Must be less than 9999 (got 9999).`)
                        })
                        it("> + >=", () => {
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
        it("unsupported", () => {
            assert(() => type("1<number<5").create()).throws.snap(
                `Error: Unable to generate a value for '1<number<5': Constraint generation is unsupported.`
            )
        })
    })
})
