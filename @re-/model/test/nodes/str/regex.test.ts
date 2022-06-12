import { assert } from "@re-/assert"
import { eager, model } from "#src"

describe("regex", () => {
    describe("type", () => {
        it("inferred as string", () => {
            assert(model("/.*/").type).typed as string
        })
        describe("errors", () => {
            it("unterminated", () => {
                // @ts-expect-error
                assert(() => eager("/.*")).throwsAndHasTypeError(
                    "Unable to determine the type of '/.*'."
                )
            })
            it("extra forward slash", () => {
                // @ts-expect-error
                assert(() => eager("/.*//")).throwsAndHasTypeError(
                    "Unable to determine the type of '/.*//'."
                )
            })
        })
    })
    describe("validation", () => {
        it("matching string", () => {
            assert(model("/.*/").validate("dursurdo").error).is(undefined)
        })
        it("messy string", () => {
            assert(
                model(`/\\((a|b)\\,[^?&]*\\)=>e+f?/`).validate("(b,c)=>eee")
                    .error
            ).is(undefined)
        })
        describe("errors", () => {
            it("bad string", () => {
                assert(model("/^[0-9]*$/").validate("durrrrrr").error).snap(
                    `'durrrrrr' does not match expression /^[0-9]*$/.`
                )
            })
            it("non-string", () => {
                assert(model("/^[0-9]*$/").validate(5).error).snap(
                    `Non-string value 5 cannot satisfy regex definitions.`
                )
            })
            it("messy string", () => {
                assert(
                    model(`/\\((a|b)\\,[^?&]*\\)=>e+f?/`).validate(
                        "(b,c&d)=>eeef"
                    ).error
                ).equals(
                    `'(b,c&d)=>eeef' does not match expression /\\((a|b)\\,[^?&]*\\)=>e+f?/.`
                )
            })
        })
    })
    describe("generation", () => {
        it("unsupported", () => {
            assert(() => model("/.*/").generate()).throws.snap(
                `Error: Unable to generate a value for '/.*/' (Regex generation is unsupported).`
            )
        })
    })
})
