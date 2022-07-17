import { assert } from "@re-/assert"
import { eager, model } from "../../src/index.js"

// TODO: Add lists, add ==, test +/- infinity and NaN

describe("bound", () => {
    describe("type", () => {
        it("single-bounded", () => {
            assert(model("string>5").type).typed as string
        })
        it("double-bounded", () => {
            assert(model("-7<integer<99").type).typed as number
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
        })
    })
    describe("validation", () => {
        it("string length", () => {
            assert(
                model("string>4").validate("longerThanFourCharacters").error
            ).is(undefined)
            assert(model("string<4").validate("4").error).is(undefined)
            assert(model("string<=4").validate("four").error).is(undefined)
            assert(model("string<=4").validate("4").error).is(undefined)
            assert(model("string>=4").validate("four").error).is(undefined)
            assert(
                model("string>=4").validate("longerThanFourCharacters").error
            ).is(undefined)
        })
        it("valid single-bounded", () => {
            assert(model("number>5").validate(7).error).is(undefined)
            assert(model("number<-999").validate(-1000).error).is(undefined)
            assert(model("number>=5").validate(5).error).is(undefined)
            assert(model("number>=5").validate(9999).error).is(undefined)
            assert(model("number<=-5").validate(-5).error).is(undefined)
            assert(model("number<=-5").validate(-1000).error).is(undefined)
        })
        it("valid double-bounded", () => {
            assert(model("5<number<10").validate(7).error).is(undefined)
            assert(model("7>number>-2000").validate(-1000).error).is(undefined)
            assert(model("5<=number<9999").validate(5).error).is(undefined)
            assert(model("5<=number<9999").validate(9998).error).is(undefined)
            assert(model("-5>=number>=-1000").validate(-5).error).is(undefined)
            assert(model("-5>=number>=-1000").validate(-1000).error).is(
                undefined
            )
        })
        describe("errors", () => {
            it("invalid string length", () => {
                assert(model("string>4").validate("four").error?.message).snap(
                    `Must be greater than 4 characters (got 4).`
                )
                assert(model("string>4").validate("4").error?.message).snap(
                    `Must be greater than 4 characters (got 1).`
                )
                assert(model("string<4").validate("four").error?.message).snap(
                    `Must be less than 4 characters (got 4).`
                )
                assert(
                    model("string<4").validate("longerThanFourCharacters").error
                        ?.message
                ).snap(`Must be less than 4 characters (got 24).`)
                assert(model("string>=4").validate("4").error?.message).snap(
                    `Must be greater than or equal to 4 characters (got 1).`
                )
                assert(
                    model("string<=4").validate("longerThanFourCharacters")
                        .error?.message
                ).snap(`Must be less than or equal to 4 characters (got 24).`)
            })
            it("single-bounded invalid", () => {
                assert(model("number<=5").validate(7).error?.message).snap(
                    `Must be less than or equal to 5 (got 7).`
                )
                assert(
                    model("number>=-999").validate(-1000).error?.message
                ).snap(`Must be greater than or equal to -999 (got -1000).`)
                assert(model("number<5").validate(5).error?.message).snap(
                    `Must be less than 5 (got 5).`
                )
                assert(model("number<5").validate(9999).error?.message).snap(
                    `Must be less than 5 (got 9999).`
                )
                assert(model("number>-5").validate(-5).error?.message).snap(
                    `Must be greater than -5 (got -5).`
                )
                assert(model("number>-5").validate(-1000).error?.message).snap(
                    `Must be greater than -5 (got -1000).`
                )
            })
            it("double-bounded invalid", () => {
                assert(model("5<number<10").validate(-9).error?.message).snap(
                    `Must be greater than 5 (got -9).`
                )
                assert(model("5<number<10").validate(99).error?.message).snap(
                    `Must be less than 10 (got 99).`
                )
                assert(
                    model("7>number>-2000").validate(-3000).error?.message
                ).snap(`Must be greater than -2000 (got -3000).`)
                assert(
                    model("7>number>-2000").validate(3000).error?.message
                ).snap(`Must be less than 7 (got 3000).`)
                assert(
                    model("5<=number<9999").validate(9999).error?.message
                ).snap(`Must be less than 9999 (got 9999).`)
                assert(
                    model("5<=number<9999").validate(10_000).error?.message
                ).snap(`Must be less than 9999 (got 10000).`)
                assert(model("5<=number<9999").validate(4).error?.message).snap(
                    `Must be greater than or equal to 5 (got 4).`
                )
                assert(
                    model("-5>=number>=-1000").validate(0).error?.message
                ).snap(`Must be less than or equal to -5 (got 0).`)
                assert(
                    model("-5>=number>=-1000").validate(-1001).error?.message
                ).snap(`Must be greater than or equal to -1000 (got -1001).`)
            })
        })
    })
    describe("generation", () => {
        it("unsupported", () => {
            assert(() => model("1<number<5").create()).throws.snap(
                `Error: Unable to generate a value for '1<number<5': Constraint generation is unsupported.`
            )
        })
    })
})
