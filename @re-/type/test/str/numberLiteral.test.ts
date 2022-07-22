import { assert } from "@re-/assert"
import { eager, type } from "../../src/index.js"

describe("numberLiteral", () => {
    /*
     * TODO: Until ts-morph's embedded TS version is >= 4.8, these will still be inferred as number
     */
    describe("type", () => {
        it("whole", () => {
            // assert(model("4").type).typed as 4
            assert(type("4").infer).typed as number
        })
        it("decimal", () => {
            // assert(model("1.234").type).typed as 1.234
            assert(type("1.234").infer).typed as number
        })
        it("negative", () => {
            // assert(model("-5.7").type).typed as -5.7
            assert(type("-5.7").infer).typed as number
        })
        describe("errors", () => {
            it("multiple decimals", () => {
                // @ts-expect-error
                assert(() => eager("127.0.0.1")).throwsAndHasTypeError(
                    "Unable to determine the type of '127.0.0.1'."
                )
            })
            it("with alpha", () => {
                // @ts-expect-error
                assert(() => eager("13three7")).throwsAndHasTypeError(
                    "Unable to determine the type of '13three7'."
                )
            })
        })
    })
    describe("validation", () => {
        it("whole", () => {
            const eight = type("8")
            assert(eight.validate(8).error).is(undefined)
            assert(eight.validate(8).error).is(undefined)
            assert(eight.validate(8.000_001).error?.message).snap(
                "8.000001 is not assignable to 8."
            )
            assert(eight.validate("8").error?.message).snap(
                `"8" is not assignable to 8.`
            )
        })
        it("decimal", () => {
            const goldenRatio = type("1.618")
            assert(goldenRatio.validate(1.618).error).is(undefined)
            assert(goldenRatio.validate(2).error?.message).snap(
                "2 is not assignable to 1.618."
            )
            assert(goldenRatio.validate("1.618").error?.message).snap(
                `"1.618" is not assignable to 1.618.`
            )
        })
        it("negative", () => {
            const unLeet = type("-13.37")
            assert(unLeet.validate(-13.37).error).is(undefined)
            assert(unLeet.validate(-14).error?.message).snap(
                "-14 is not assignable to -13.37."
            )
            assert(unLeet.validate("-13.37").error?.message).snap(
                `"-13.37" is not assignable to -13.37.`
            )
        })
    })
    describe("generation", () => {
        it("whole", () => {
            assert(type("31").create()).is(31)
        })
        it("decimal", () => {
            assert(type("31.31").create()).is(31.31)
        })
        it("negative", () => {
            assert(type("-31.31").create()).is(-31.31)
        })
    })
})
