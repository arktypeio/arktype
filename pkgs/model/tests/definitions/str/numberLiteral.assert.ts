import { assert } from "@re-/assert"
import { model } from "@re-/model"

export const testNumberLiteral = () => {
    // As of TS 4.5, I don't think it's possible to parse a number literal from a string type
    // Runtime functionality like "getDefault" and "validate" will still use the more specific
    // value, but the TS type is inferred as "number"
    describe("type", () => {
        test("whole", () => {
            assert(model("4").type).typed as number
        })
        test("decimal", () => {
            assert(model("1.234").type).typed as number
        })
        test("negative", () => {
            assert(model("-5.7").type).typed as number
        })
        describe("errors", () => {
            test("multiple decimals", () => {
                // @ts-expect-error
                assert(() => model("127.0.0.1")).throwsAndHasTypeError(
                    "Unable to determine the type of '127.0.0.1'."
                )
            })
            test("with alpha", () => {
                // @ts-expect-error
                assert(() => model("13three7")).throwsAndHasTypeError(
                    "Unable to determine the type of '13three7'."
                )
            })
        })
    })
    describe("validation", () => {
        test("whole", () => {
            const { validate } = model("8")
            assert(validate(8).error).is(undefined)
            assert(validate(8.0).error).is(undefined)
            assert(validate(8.000001).error).is(
                "8.000001 is not assignable to 8."
            )
            assert(validate("8").error).is("'8' is not assignable to 8.")
        })
        test("decimal", () => {
            const { validate } = model("1.618")
            assert(validate(1.618).error).is(undefined)
            assert(validate(2).error).is("2 is not assignable to 1.618.")
            assert(validate("1.618").error).is(
                "'1.618' is not assignable to 1.618."
            )
        })
        test("negative", () => {
            const { validate } = model("-13.37")
            assert(validate(-13.37).error).is(undefined)
            assert(validate(-14).error).is("-14 is not assignable to -13.37.")
            assert(validate("-13.37").error).is(
                "'-13.37' is not assignable to -13.37."
            )
        })
    })
    describe("generation", () => {
        test("whole", () => {
            assert(model("31").generate()).is(31)
        })
        test("decimal", () => {
            assert(model("31.31").generate()).is(31.31)
        })
        test("negative", () => {
            assert(model("-31.31").generate()).is(-31.31)
        })
    })
}
