import { assert } from "@re-/assert"
import { define } from "@re-/model"

export const testNumberLiteral = () => {
    // As of TS 4.5, I don't think it's possible to parse a number literal from a string type
    // Runtime functionality like "getDefault" and "validate" will still use the more specific
    // value, but the TS type is inferred as "number"
    describe("type", () => {
        test("whole", () => {
            assert(define("4").type).typed as number
        })
        test("decimal", () => {
            assert(define("1.234").type).typed as number
        })
        test("negative", () => {
            assert(define("-5.7").type).typed as number
        })
        describe("errors", () => {
            test("multiple decimals", () => {
                // @ts-expect-error
                assert(() => define("127.0.0.1")).throwsAndHasTypeError(
                    "Unable to determine the type of '127.0.0.1'."
                )
            })
            test("with alpha", () => {
                // @ts-expect-error
                assert(() => define("13three7")).throwsAndHasTypeError(
                    "Unable to determine the type of '13three7'."
                )
            })
        })
    })
    describe("validation", () => {
        test("whole", () => {
            const { validate } = define("8")
            assert(validate(8).errors).is(undefined)
            assert(validate(8.0).errors).is(undefined)
            assert(validate(8.000001).errors).is(
                "8.000001 is not assignable to 8."
            )
            assert(validate("8").errors).is("'8' is not assignable to 8.")
        })
        test("decimal", () => {
            const { validate } = define("1.618")
            assert(validate(1.618).errors).is(undefined)
            assert(validate(2).errors).is("2 is not assignable to 1.618.")
            assert(validate("1.618").errors).is(
                "'1.618' is not assignable to 1.618."
            )
        })
        test("negative", () => {
            const { validate } = define("-13.37")
            assert(validate(-13.37).errors).is(undefined)
            assert(validate(-14).errors).is("-14 is not assignable to -13.37.")
            assert(validate("-13.37").errors).is(
                "'-13.37' is not assignable to -13.37."
            )
        })
    })
    describe("generation", () => {
        test("whole", () => {
            assert(define("31").generate()).is(31)
        })
        test("decimal", () => {
            assert(define("31.31").generate()).is(31.31)
        })
        test("negative", () => {
            assert(define("-31.31").generate()).is(-31.31)
        })
    })
}
