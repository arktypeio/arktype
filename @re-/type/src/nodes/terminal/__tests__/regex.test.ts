import { assert } from "@re-/assert"
import { describe, test } from "vitest"
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
                    "Unable to determine the type of '/.*'."
                )
            })
            test("extra forward slash", () => {
                // @ts-expect-error
                assert(() => type("/.*//")).throwsAndHasTypeError(
                    "Unable to determine the type of '/.*//'."
                )
            })
        })
    })
    describe("validation", () => {
        test("matching string", () => {
            assert(type("/.*/").validate("dursurdo").error).is(undefined)
        })
        test("messy string", () => {
            assert(
                type(`/\\((a|b)\\,[^?&]*\\)=>e+f?/`).validate("(b,c)=>eee")
                    .error
            ).is(undefined)
        })
        describe("errors", () => {
            test("bad string", () => {
                assert(
                    type("/^[0-9]*$/").validate("durrrrrr").error?.message
                ).snap(`"durrrrrr" does not match expression /^[0-9]*$/.`)
            })
            test("non-string", () => {
                assert(type("/^[0-9]*$/").validate(5).error?.message).snap(
                    `Non-string value 5 cannot satisfy regex definitions.`
                )
            })
            test("messy string", () => {
                assert(
                    type(`/\\((a|b)\\,[^?&]*\\)=>e+f?/`).validate(
                        "(b,c&d)=>eeef"
                    ).error?.message
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
