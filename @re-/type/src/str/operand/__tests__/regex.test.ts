import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../index.js"

describe("regex", () => {
    describe("type", () => {
        test("inferred as string", () => {
            assert(type("/.*/").infer).typed as string
        })
        describe("errors", () => {
            test("unterminated", () => {
                // @ts-expect-error
                assert(() => type("/.*")).throwsAndHasTypeError(
                    "/.* requires a closing /."
                )
            })
        })
    })
    describe("validation", () => {
        test("matching string", () => {
            assert(type("/.*/").check("dursurdo").error).is(undefined)
        })
        test("messy string", () => {
            assert(
                type(`/\\((a|b)\\,[^?&]*\\)=>e+f?/`).check("(b,c)=>eee").error
            ).is(undefined)
        })
        describe("errors", () => {
            test("bad string", () => {
                assert(
                    type("/^[0-9]*$/").check("durrrrrr").error?.message
                ).snap(`"durrrrrr" does not match expression /^[0-9]*$/.`)
            })
            test("non-string", () => {
                assert(type("/^[0-9]*$/").check(5).error?.message).snap(
                    `Non-string value 5 cannot satisfy regex definitions.`
                )
            })
            test("messy string", () => {
                assert(
                    type(`/\\((a|b)\\,[^?&]*\\)=>e+f?/`).check("(b,c&d)=>eeef")
                        .error?.message
                ).snap(
                    `"(b,c&d)=>eeef" does not match expression /\\((a|b)\\,[^?&]*\\)=>e+f?/.`
                )
            })
        })
    })
    describe("generation", () => {
        test("unsupported", () => {
            assert(() => type("/.*/").create()).throws.snap(
                `Error: Unable to generate a value for '/.*/': Regex generation is unsupported.`
            )
        })
    })
})
