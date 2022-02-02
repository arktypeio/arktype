import { assert } from "@re-/assert"
import { define } from "@re-/model"

export const testTuple = () => {
    describe("type", () => {
        test("empty", () => {
            assert(define([]).type).typed as []
        })
        test("shallow", () => {
            assert(define(["string", "number", 6]).type).typed as [
                string,
                number,
                6
            ]
        })
        test("nested", () => {
            assert(
                define(["'Cuckoo'", ["'Swallow'", "'Oriole'", "'Condor'"]]).type
            ).typed as ["Cuckoo", ["Swallow", "Oriole", "Condor"]]
        })
        describe("errors", () => {
            test("invalid property", () => {
                assert(() =>
                    // @ts-expect-error
                    define(["string", ["number", "boolean", "whoops"]])
                )
                    .throws(
                        "Unable to determine the type of 'whoops' at path 1/2."
                    )
                    .type.errors("Unable to determine the type of 'whoops'")
            })
        })
    })
    describe("validation", () => {
        test("empty", () => {
            const { validate } = define([])
            assert(validate([]).errors).is(undefined)
            assert(validate({}).errors).snap()
        })
    })
    describe("generation", () => {})
}
