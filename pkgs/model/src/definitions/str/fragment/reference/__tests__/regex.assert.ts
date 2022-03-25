import { assert } from "@re-/assert"
import { define } from "@re-/model"

export const testRegex = () => {
    describe("type", () => {
        test("inferred as string", () => {
            assert(define("/.*/").type).typed as string
        })
        describe("errors", () => {
            test("unterminated", () => {
                // @ts-expect-error
                assert(() => define("/.*")).throwsAndHasTypeError(
                    "Unable to determine the type of '/.*'."
                )
            })
            test("extra forward slash", () => {
                // @ts-expect-error
                assert(() => define("/.*//")).throwsAndHasTypeError(
                    "Unable to determine the type of '/.*//'."
                )
            })
        })
    })
    describe("validation", () => {
        test("matching string", () => {
            assert(define("/.*/").validate("dursurdo").errors).is(undefined)
        })
        test("messy string", () => {
            assert(
                define(`/\((a|b)\,[^?&]*\)=>e+f?/`).validate("(b,c)=>eee")
                    .errors
            ).is(undefined)
        })
        describe("errors", () => {
            test("bad string", () => {
                assert(define("/^[0-9]*$/").validate("durrrrrr").errors).snap(
                    `"'durrrrrr' is not assignable to /^[0-9]*$/."`
                )
            })
            test("non-string", () => {
                assert(define("/^[0-9]*$/").validate(5).errors).snap(
                    `"5 is not assignable to /^[0-9]*$/."`
                )
            })
            test("messy string", () => {
                assert(
                    define(`/\((a|b)\,[^?&]*\)=>e+f?/`).validate(
                        "(b,c&d)=>eeef"
                    ).errors
                ).equals(
                    `'(b,c&d)=>eeef' is not assignable to /((a|b),[^?&]*)=>e+f?/.`
                )
            })
        })
    })
    describe("generation", () => {
        test("unsupported", () => {
            assert(() => define("/.*/").generate()).throws.snap(
                `"Unable to generate a value for '/.*/' (regex generation is unsupported)."`
            )
        })
    })
}
