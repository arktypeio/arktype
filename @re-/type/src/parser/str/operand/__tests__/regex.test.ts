import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../type.js"
import { unterminatedEnclosedMessage } from "../enclosed.js"

describe("regex", () => {
    describe("type", () => {
        test("inferred as string", () => {
            assert(type("/.*/").infer).typed as string
        })
        describe("errors", () => {
            test("unterminated", () => {
                // @ts-expect-error
                assert(() => type("/.*")).throwsAndHasTypeError(
                    unterminatedEnclosedMessage("/.*", "/")
                )
            })
        })
    })
    describe("validation", () => {
        test("matching string", () => {
            assert(type("/.*/").check("dursurdo").errors).is(undefined)
        })
        test("messy string", () => {
            assert(
                type(`/\\((a|b)\\,[^?&]*\\)=>e+f?/`).check("(b,c)=>eee").errors
            ).is(undefined)
        })
        describe("errors", () => {
            test("bad string", () => {
                assert(
                    type("/^[0-9]*$/").check("durrrrrr").errors?.summary
                ).snap(`'durrrrrr' must match expression /^[0-9]*$/.`)
            })
            test("non-string", () => {
                // TODO: Improve subtype errors
                assert(type("/^[0-9]*$/").check(5).errors?.summary).snap(
                    `Must be a string (was number).`
                )
            })
            test("messy string", () => {
                assert(
                    type(`/\\((a|b)\\,[^?&]*\\)=>e+f?/`).check("(b,c&d)=>eeef")
                        .errors?.summary
                ).snap(
                    `'(b,c&d)=>eeef' must match expression /\\((a|b)\\,[^?&]*\\)=>e+f?/.`
                )
            })
        })
    })
    describe("generation", () => {
        test("unsupported", () => {
            assert(() => type("/.*/").create()).throws.snap(
                `Error: Unable to generate a value for '/.*/': Constrained generation is not yet supported.`
            )
        })
    })
})
