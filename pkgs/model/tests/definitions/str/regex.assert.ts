import { assert } from "@re-/assert"
import { model } from "@re-/model"

export const testRegex = () => {
    describe("type", () => {
        test("inferred as string", () => {
            assert(model("/.*/").type).typed as string
        })
        describe("errors", () => {
            test("unterminated", () => {
                // @ts-expect-error
                assert(() => model("/.*")).throwsAndHasTypeError(
                    "Unable to determine the type of '/.*'."
                )
            })
            test("extra forward slash", () => {
                // @ts-expect-error
                assert(() => model("/.*//")).throwsAndHasTypeError(
                    "Unable to determine the type of '/.*//'."
                )
            })
        })
    })
    describe("validation", () => {
        test("matching string", () => {
            assert(model("/.*/").validate("dursurdo").error).is(undefined)
        })
        test("messy string", () => {
            assert(
                model(`/\((a|b)\,[^?&]*\)=>e+f?/`).validate("(b,c)=>eee").error
            ).is(undefined)
        })
        describe("errors", () => {
            test("bad string", () => {
                assert(model("/^[0-9]*$/").validate("durrrrrr").error).snap(
                    `"'durrrrrr' is not assignable to /^[0-9]*$/."`
                )
            })
            test("non-string", () => {
                assert(model("/^[0-9]*$/").validate(5).error).snap(
                    `"5 is not assignable to /^[0-9]*$/."`
                )
            })
            test("messy string", () => {
                assert(
                    model(`/\((a|b)\,[^?&]*\)=>e+f?/`).validate("(b,c&d)=>eeef")
                        .error
                ).equals(
                    `'(b,c&d)=>eeef' is not assignable to /((a|b),[^?&]*)=>e+f?/.`
                )
            })
        })
    })
    describe("generation", () => {
        test("unsupported", () => {
            assert(() => model("/.*/").generate()).throws.snap(
                `"Unable to generate a value for '/.*/' (regex generation is unsupported)."`
            )
        })
    })
}
