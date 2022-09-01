import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../index.js"

describe("numberLiteral", () => {
    // TODO: ts-morph 4.8
    describe("type", () => {
        test("whole", () => {
            // assert(model("4").type).typed as 4
            assert(type("4").infer).typed as number
        })
        test("decimal", () => {
            // assert(model("1.234").type).typed as 1.234
            assert(type("1.234").infer).typed as number
        })
        test("negative", () => {
            // assert(model("-5.7").type).typed as -5.7
            assert(type("-5.7").infer).typed as number
        })
        describe("errors", () => {
            test("multiple decimals", () => {
                // @ts-expect-error
                assert(() => type("127.0.0.1")).throwsAndHasTypeError(
                    "'127.0.0.1' is not a builtin type and does not exist in your space."
                )
            })
            test("with alpha", () => {
                // @ts-expect-error
                assert(() => type("13three7")).throwsAndHasTypeError(
                    "'13three7' is not a builtin type and does not exist in your space."
                )
            })
        })
    })
    describe("validation", () => {
        test("whole", () => {
            const eight = type("8")
            assert(eight.check(8).errors).is(undefined)
            assert(eight.check(8).errors).is(undefined)
            assert(eight.check(8.000_001).errors?.summary).snap(
                "8.000001 is not assignable to 8."
            )
            assert(eight.check("8").errors?.summary).snap(
                `"8" is not assignable to 8.`
            )
        })
        test("decimal", () => {
            const goldenRatio = type("1.618")
            assert(goldenRatio.check(1.618).errors).is(undefined)
            assert(goldenRatio.check(2).errors?.summary).snap(
                "2 is not assignable to 1.618."
            )
            assert(goldenRatio.check("1.618").errors?.summary).snap(
                `"1.618" is not assignable to 1.618.`
            )
        })
        test("negative", () => {
            const unLeet = type("-13.37")
            assert(unLeet.check(-13.37).errors).is(undefined)
            assert(unLeet.check(-14).errors?.summary).snap(
                "-14 is not assignable to -13.37."
            )
            assert(unLeet.check("-13.37").errors?.summary).snap(
                `"-13.37" is not assignable to -13.37.`
            )
        })
    })
    describe("generation", () => {
        test("whole", () => {
            assert(type("31").create()).is(31)
        })
        test("decimal", () => {
            assert(type("31.31").create()).is(31.31)
        })
        test("negative", () => {
            assert(type("-31.31").create()).is(-31.31)
        })
    })
})
