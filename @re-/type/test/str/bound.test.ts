import { assert } from "@re-/assert"
import { eager, type } from "../../src/index.js"

describe("bound", () => {
    describe("type", () => {
        it("single-bounded", () => {
            assert(type("string>5").type).typed as string
        })
        it("double-bounded", () => {
            assert(type("-7<=integer<99").type).typed as number
        })
        it("list", () => {
            assert(type("-7<=unknown[]<99").type).typed as unknown[]
        })
        it("parenthesized list", () => {
            assert(type("-7<=(string|number[]|boolean[][])[]<99").type)
                .typed as (string | number[] | boolean[][])[]
        })
        describe("errors", () => {
            it("invalid single bound", () => {
                // @ts-expect-error
                assert(() => eager("number<integer")).throwsAndHasTypeError(
                    "Bounding value 'integer' must be a number literal."
                )
            })
            it("invalid left bound", () => {
                // @ts-expect-error
                assert(() => eager("null<number<5")).throwsAndHasTypeError(
                    "Bounding value 'null' must be a number literal."
                )
            })
            it("invalid right bound", () => {
                // @ts-expect-error
                assert(() => eager("1<number<string")).throwsAndHasTypeError(
                    "Bounding value 'string' must be a number literal."
                )
            })
            it("two invalid bounds", () => {
                assert(() =>
                    // @ts-expect-error
                    eager("number<number<number")
                ).throwsAndHasTypeError(
                    "Bounding value 'number' must be a number literal."
                )
            })
            it("single-bounded unboundable", () => {
                // @ts-expect-error
                assert(() => eager("object<999")).throwsAndHasTypeError(
                    "Definition 'object' is not boundable."
                )
            })
            it("double-bounded unboundable", () => {
                // @ts-expect-error
                assert(() => eager("1<5<999")).throwsAndHasTypeError(
                    "Definition '5' is not boundable."
                )
            })
            it("left-only bounds", () => {
                // @ts-expect-error
                assert(() => eager("1>5>number[]")).throwsAndHasTypeError(
                    "Left side of comparator > cannot be bounded more than once."
                )
            })
            it("extra left bounds", () => {
                // @ts-expect-error
                assert(() => eager("1<5<number<10")).throwsAndHasTypeError(
                    "Left side of comparator < cannot be bounded more than once."
                )
            })
            it("right-only bounds", () => {
                // @ts-expect-error
                assert(() => eager("number>=5>999")).throwsAndHasTypeError(
                    "Right side of comparator > cannot be bounded more than once."
                )
            })
            it("extra right bounds", () => {
                // @ts-expect-error
                assert(() => eager("1<number<999<1000")).throwsAndHasTypeError(
                    "Right side of comparator < cannot be bounded more than once."
                )
            })
        })
    })
    describe("validation", () => {
        it("string length", () => {
            assert(
                type("string>4").validate("longerThanFourCharacters").error
            ).is(undefined)
            assert(type("string<4").validate("4").error).is(undefined)
            assert(type("string<=4").validate("four").error).is(undefined)
            assert(type("string<=4").validate("4").error).is(undefined)
            assert(type("string>=4").validate("four").error).is(undefined)
            assert(
                type("string>=4").validate("longerThanFourCharacters").error
            ).is(undefined)
        })
        it("list length", () => {
            assert(
                type("any[]>4").validate([1, "two", { three: 3 }, 4, 5]).error
            ).is(undefined)
            assert(
                type("boolean[][]<4").validate([
                    [true, false, true],
                    [true],
                    []
                ]).error
            ).is(undefined)
        })
        it("list length errors", () => {
            assert(
                type("any[]>4").validate([1, "two", { three: 3 }, 4]).error
            ).snap()
            assert(
                type("boolean[][]<4").validate([
                    [true, false, true],
                    [false],
                    [true],
                    [],
                    [true]
                ]).error
            ).snap()
            assert(
                type("boolean[][]<4").validate([[true, "false", true], [true]])
                    .error
            ).snap()
        })
        it("valid single-bounded", () => {
            assert(type("number>5").validate(7).error).is(undefined)
            assert(type("number<-999").validate(-1000).error).is(undefined)
            assert(type("number>=5").validate(5).error).is(undefined)
            assert(type("number>=5").validate(9999).error).is(undefined)
            assert(type("number<=-5").validate(-5).error).is(undefined)
            assert(type("number<=-5").validate(-1000).error).is(undefined)
        })
        it("valid double-bounded", () => {
            assert(type("5<number<10").validate(7).error).is(undefined)
            assert(type("7>number>-2000").validate(-1000).error).is(undefined)
            assert(type("5<=number<9999").validate(5).error).is(undefined)
            assert(type("5<=number<9999").validate(9998).error).is(undefined)
            assert(type("-5>=number>=-1000").validate(-5).error).is(undefined)
            assert(type("-5>=number>=-1000").validate(-1000).error).is(
                undefined
            )
        })
        it("infinity", () => {
            assert(type("number>10").validate(Infinity).error).equals(undefined)
            assert(type("number>10").validate(-Infinity).error).snap()
        })
        it("NaN", () => {
            assert(type("number>=10").validate(Number.NaN).error).snap()
            assert(type("number<=10").validate(Number.NaN).error).snap()
        })
        describe("errors", () => {
            it("invalid string length", () => {
                assert(type("string>4").validate("four").error?.message).snap(
                    `Must be greater than 4 characters (got 4).`
                )
                assert(type("string>4").validate("4").error?.message).snap(
                    `Must be greater than 4 characters (got 1).`
                )
                assert(type("string<4").validate("four").error?.message).snap(
                    `Must be less than 4 characters (got 4).`
                )
                assert(
                    type("string<4").validate("longerThanFourCharacters").error
                        ?.message
                ).snap(`Must be less than 4 characters (got 24).`)
                assert(type("string>=4").validate("4").error?.message).snap(
                    `Must be greater than or equal to 4 characters (got 1).`
                )
                assert(
                    type("string<=4").validate("longerThanFourCharacters").error
                        ?.message
                ).snap(`Must be less than or equal to 4 characters (got 24).`)
            })
            it("single-bounded invalid", () => {
                assert(type("number<=5").validate(7).error?.message).snap(
                    `Must be less than or equal to 5 (got 7).`
                )
                assert(
                    type("number>=-999").validate(-1000).error?.message
                ).snap(`Must be greater than or equal to -999 (got -1000).`)
                assert(type("number<5").validate(5).error?.message).snap(
                    `Must be less than 5 (got 5).`
                )
                assert(type("number<5").validate(9999).error?.message).snap(
                    `Must be less than 5 (got 9999).`
                )
                assert(type("number>-5").validate(-5).error?.message).snap(
                    `Must be greater than -5 (got -5).`
                )
                assert(type("number>-5").validate(-1000).error?.message).snap(
                    `Must be greater than -5 (got -1000).`
                )
            })
            it("double-bounded invalid", () => {
                assert(type("5<number<10").validate(-9).error?.message).snap(
                    `Must be greater than 5 (got -9).`
                )
                assert(type("5<number<10").validate(99).error?.message).snap(
                    `Must be less than 10 (got 99).`
                )
                assert(
                    type("7>number>-2000").validate(-3000).error?.message
                ).snap(`Must be greater than -2000 (got -3000).`)
                assert(
                    type("7>number>-2000").validate(3000).error?.message
                ).snap(`Must be less than 7 (got 3000).`)
                assert(
                    type("5<=number<9999").validate(9999).error?.message
                ).snap(`Must be less than 9999 (got 9999).`)
                assert(
                    type("5<=number<9999").validate(10_000).error?.message
                ).snap(`Must be less than 9999 (got 10000).`)
                assert(type("5<=number<9999").validate(4).error?.message).snap(
                    `Must be greater than or equal to 5 (got 4).`
                )
                assert(
                    type("-5>=number>=-1000").validate(0).error?.message
                ).snap(`Must be less than or equal to -5 (got 0).`)
                assert(
                    type("-5>=number>=-1000").validate(-1001).error?.message
                ).snap(`Must be greater than or equal to -1000 (got -1001).`)
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
