import { assert } from "@re-/assert"
import { create } from "@re-/model"

export const testRegex = () => {
    describe("type", () => {
        test("inferred as string", () => {
            assert(create("/.*/").type).typed as string
        })
        describe("errors", () => {
            test("unterminated", () => {
                // @ts-expect-error
                assert(() => create("/.*")).throwsAndHasTypeError(
                    "Unable to determine the type of '/.*'."
                )
            })
            test("extra forward slash", () => {
                // @ts-expect-error
                assert(() => create("/.*//")).throwsAndHasTypeError(
                    "Unable to determine the type of '/.*//'."
                )
            })
        })
    })
    describe("validation", () => {
        test("matching string", () => {
            assert(create("/.*/").validate("dursurdo").errors).is(undefined)
        })
        test("messy string", () => {
            assert(
                create(`/\((a|b)\,[^?&]*\)=>e+f?/`).validate("(b,c)=>eee")
                    .errors
            ).is(undefined)
        })
        describe("errors", () => {
            test("bad string", () => {
                assert(create("/^[0-9]*$/").validate("durrrrrr").errors).snap(
                    `"'durrrrrr' is not assignable to /^[0-9]*$/."`
                )
            })
            test("non-string", () => {
                assert(create("/^[0-9]*$/").validate(5).errors).snap(
                    `"5 is not assignable to /^[0-9]*$/."`
                )
            })
            test("messy string", () => {
                assert(
                    create(`/\((a|b)\,[^?&]*\)=>e+f?/`).validate(
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
            assert(() => create("/.*/").generate()).throws.snap(
                `"Unable to generate a value for '/.*/' (regex generation is unsupported)."`
            )
        })
    })
}
