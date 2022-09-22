import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../type.js"
import { unresolvableMessage } from "../unenclosed.js"

describe("numberLiteral", () => {
    describe("type", () => {
        test("whole", () => {
            assert(type("4").infer).typed as 4
        })
        test("decimal", () => {
            assert(type("1.234").infer).typed as 1.234
        })
        test("negative", () => {
            assert(type("-5.7").infer).typed as -5.7
        })
        describe("errors", () => {
            test("multiple decimals", () => {
                // @ts-expect-error
                assert(() => type("127.0.0.1")).throwsAndHasTypeError(
                    unresolvableMessage("127.0.0.1")
                )
            })
            test("with alpha", () => {
                // @ts-expect-error
                assert(() => type("13three7")).throwsAndHasTypeError(
                    unresolvableMessage("13three7")
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
                `Must be 8 (was 8.000001).`
            )
            assert(eight.check("8").errors?.summary).snap(
                `Must be 8 (was "8").`
            )
        })
        test("decimal", () => {
            const goldenRatio = type("1.618")
            assert(goldenRatio.check(1.618).errors).is(undefined)
            assert(goldenRatio.check(2).errors?.summary).snap(
                `Must be 1.618 (was 2).`
            )
            assert(goldenRatio.check("1.618").errors?.summary).snap(
                `Must be 1.618 (was "1.618").`
            )
        })
        test("negative", () => {
            const unLeet = type("-13.37")
            assert(unLeet.check(-13.37).errors).is(undefined)
            assert(unLeet.check(-14).errors?.summary).snap(
                `Must be -13.37 (was -14).`
            )
            assert(unLeet.check("-13.37").errors?.summary).snap(
                `Must be -13.37 (was "-13.37").`
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
