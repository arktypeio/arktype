import { assert } from "@re-/assert"
import { model } from "#api"

describe("numberLiteral", () => {
    /*
     * As of TS 4.5, I don't think it's possible to parse a number literal from a string type
     * Runtime functionality like "getDefault" and "validate" will still use the more specific
     * value, but the TS type is inferred as "number"
     */
    describe("type", () => {
        it("whole", () => {
            assert(model("4").type).typed as number
        })
        it("decimal", () => {
            assert(model("1.234").type).typed as number
        })
        it("negative", () => {
            assert(model("-5.7").type).typed as number
        })
        describe("errors", () => {
            it("multiple decimals", () => {
                // @ts-expect-error
                assert(() => model("127.0.0.1")).throwsAndHasTypeError(
                    "Unable to determine the type of '127.0.0.1'."
                )
            })
            it("with alpha", () => {
                // @ts-expect-error
                assert(() => model("13three7")).throwsAndHasTypeError(
                    "Unable to determine the type of '13three7'."
                )
            })
        })
    })
    describe("validation", () => {
        it("whole", () => {
            const eight = model("8")
            assert(eight.validate(8).error).is(undefined)
            assert(eight.validate(8).error).is(undefined)
            assert(eight.validate(8.000_001).error).is(
                "8.000001 is not assignable to 8."
            )
            assert(eight.validate("8").error).is("'8' is not assignable to 8.")
        })
        it("decimal", () => {
            const goldenRatio = model("1.618")
            assert(goldenRatio.validate(1.618).error).is(undefined)
            assert(goldenRatio.validate(2).error).is(
                "2 is not assignable to 1.618."
            )
            assert(goldenRatio.validate("1.618").error).is(
                "'1.618' is not assignable to 1.618."
            )
        })
        it("negative", () => {
            const unLeet = model("-13.37")
            assert(unLeet.validate(-13.37).error).is(undefined)
            assert(unLeet.validate(-14).error).is(
                "-14 is not assignable to -13.37."
            )
            assert(unLeet.validate("-13.37").error).is(
                "'-13.37' is not assignable to -13.37."
            )
        })
    })
    describe("generation", () => {
        it("whole", () => {
            assert(model("31").generate()).is(31)
        })
        it("decimal", () => {
            assert(model("31.31").generate()).is(31.31)
        })
        it("negative", () => {
            assert(model("-31.31").generate()).is(-31.31)
        })
    })
})
