import { assert } from "@re-/assert"
import { type } from "../../src/index.js"

describe("regex", () => {
    describe("type", () => {
        it("inferred as string", () => {
            assert(type("/.*/").infer).typed as string
        })
        describe("errors", () => {
            it("unterminated", () => {
                // @ts-expect-error
                assert(() => type("/.*")).throwsAndHasTypeError(
                    "Unable to determine the type of '/.*'."
                )
            })
            it("extra forward slash", () => {
                // @ts-expect-error
                assert(() => type("/.*//")).throwsAndHasTypeError(
                    "Unable to determine the type of '/.*//'."
                )
            })
        })
    })
    describe("validation", () => {
        it("matching string", () => {
            assert(type("/.*/").validate("dursurdo").error).is(undefined)
        })
        it("messy string", () => {
            assert(
                type(`/\\((a|b)\\,[^?&]*\\)=>e+f?/`).validate("(b,c)=>eee")
                    .error
            ).is(undefined)
        })
        describe("errors", () => {
            it("bad string", () => {
                assert(
                    type("/^[0-9]*$/").validate("durrrrrr").error?.message
                ).snap(`"durrrrrr" does not match expression /^[0-9]*$/.`)
            })
            it("non-string", () => {
                assert(type("/^[0-9]*$/").validate(5).error?.message).snap(
                    `Non-string value 5 cannot satisfy regex definitions.`
                )
            })
            it("messy string", () => {
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
        it("unsupported", () => {
            assert(() => type("/.*/").create()).throws.snap(
                `Error: Unable to generate a value for '/.*/': Regex generation is unsupported.`
            )
        })
    })
})
