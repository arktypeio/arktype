import { assert } from "@re-/assert"
import { model } from "@re-/model"

describe("constraint", () => {
    describe("type", () => {
        test("single-bounded", () => {
            assert(model("string>5").type).typed as string
        })
        test("double-bounded", () => {
            assert(model("-7<integer<99").type).typed as number
        })
        describe("errors", () => {
            test("invalid single bound", () => {
                // @ts-expect-error
                assert(() => model("number<integer")).throwsAndHasTypeError(
                    "'integer' must be a number literal to bound 'number'."
                )
            })
            test("invalid left bound", () => {
                // @ts-expect-error
                assert(() => model("null<number<5")).throwsAndHasTypeError(
                    "'null' must be a number literal to bound 'number'."
                )
            })
            test("invalid right bound", () => {
                // @ts-expect-error
                assert(() => model("1<number<string")).throwsAndHasTypeError(
                    "'string' must be a number literal to bound 'number'."
                )
            })
            test("two invalid bounds", () => {
                assert(() =>
                    // @ts-expect-error
                    model("number<number<number")
                ).throwsAndHasTypeError(
                    "'number' must be a number literal to bound 'number'."
                )
            })
            test("single-bounded unboundable", () => {
                // @ts-expect-error
                assert(() => model("object<999")).throwsAndHasTypeError(
                    "Bounded definition 'object' must be a number or string keyword."
                )
            })
            test("double-bounded unboundable", () => {
                // @ts-expect-error
                assert(() => model("1<object<999")).throwsAndHasTypeError(
                    "Bounded definition 'object' must be a number or string keyword."
                )
            })
            test("doubly invalid bounded unboundable", () => {
                // @ts-expect-error
                assert(() => model("null<object<true")).throwsAndHasTypeError(
                    "Bounded definition 'object' must be a number or string keyword."
                )
            })
            test("too many values", () => {
                // @ts-expect-error
                assert(() => model("1<2<number<4")).throwsAndHasTypeError(
                    "Constraints must be either of the form N<L or L<N<L, where N is a constrainable type (e.g. number), L is a number literal (e.g. 5), and < is any comparison operator."
                )
            })
        })
    })
    describe("validation", () => {
        test("string length", () => {
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
        test("valid single-bounded", () => {
            assert(model("number>5").validate(7).error).is(undefined)
            assert(model("number<-999").validate(-1000).error).is(undefined)
            assert(model("number>=5").validate(5).error).is(undefined)
            assert(model("number>=5").validate(9999).error).is(undefined)
            assert(model("number<=-5").validate(-5).error).is(undefined)
            assert(model("number<=-5").validate(-1000).error).is(undefined)
        })
        test("valid double-bounded", () => {
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
            test("invalid string length", () => {
                assert(model("string>4").validate("four").error).snap(
                    `'four' is less than or equal to 4 characters.`
                )
                assert(model("string>4").validate("4").error).snap(
                    `'4' is less than or equal to 4 characters.`
                )
                assert(model("string<4").validate("four").error).snap(
                    `'four' is greater than or equal to 4 characters.`
                )
                assert(
                    model("string<4").validate("longerThanFourCharacters").error
                ).snap(
                    `'longerThanFourCharacters' is greater than or equal to 4 characters.`
                )
                assert(model("string>=4").validate("4").error).snap(
                    `'4' is less than 4 characters.`
                )
                assert(
                    model("string<=4").validate("longerThanFourCharacters")
                        .error
                ).snap(
                    `'longerThanFourCharacters' is greater than 4 characters.`
                )
            })
            test("single-bounded invalid", () => {
                assert(model("number<=5").validate(7).error).snap(
                    `7 is greater than 5.`
                )
                assert(model("number>=-999").validate(-1000).error).snap(
                    `-1000 is less than -999.`
                )
                assert(model("number<5").validate(5).error).snap(
                    `5 is greater than or equal to 5.`
                )
                assert(model("number<5").validate(9999).error).snap(
                    `9999 is greater than or equal to 5.`
                )
                assert(model("number>-5").validate(-5).error).snap(
                    `-5 is less than or equal to -5.`
                )
                assert(model("number>-5").validate(-1000).error).snap(
                    `-1000 is less than or equal to -5.`
                )
            })
            test("double-bounded invalid", () => {
                assert(model("5<number<10").validate(-9).error).snap(
                    `-9 is less than or equal to 5.`
                )
                assert(model("5<number<10").validate(99).error).snap(
                    `99 is greater than or equal to 10.`
                )
                assert(model("7>number>-2000").validate(-3000).error).snap(
                    `-3000 is less than or equal to -2000.`
                )
                assert(model("7>number>-2000").validate(3000).error).snap(
                    `3000 is greater than or equal to 7.`
                )
                assert(model("5<=number<9999").validate(9999).error).snap(
                    `9999 is greater than or equal to 9999.`
                )
                assert(model("5<=number<9999").validate(10_000).error).snap(
                    `10000 is greater than or equal to 9999.`
                )
                assert(model("5<=number<9999").validate(4).error).snap(
                    `4 is less than 5.`
                )
                assert(model("-5>=number>=-1000").validate(0).error).snap(
                    `0 is greater than -5.`
                )
                assert(model("-5>=number>=-1000").validate(-1001).error).snap(
                    `-1001 is less than -1000.`
                )
            })
        })
    })
    describe("generation", () => {
        test("unsupported", () => {
            assert(() => model("1<number<5").generate()).throws.snap(
                `Unable to generate a value for '1<number<5' (constraint generation is unsupported).`
            )
        })
    })
})
