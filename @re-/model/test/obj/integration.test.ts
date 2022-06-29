import { assert } from "@re-/assert"
import { model } from "../../src/index.js"

describe("integration", () => {
    const mixed = model(["true", { a: ["string", ["number|boolean[]"]] }])
    it("type", () => {
        assert(mixed.type).typed as [
            true,
            {
                a: [string, [number | boolean[]]]
            }
        ]
    })
    describe("validation", () => {
        it("standard", () => {
            assert(mixed.validate([true, { a: ["ok", [0]] }]).error).is(
                undefined
            )
        })
        describe("errors", () => {
            it("single", () => {
                assert(
                    mixed.validate([
                        true,
                        { a: ["ok", [[true, false]], "extraElement"] }
                    ]).error?.message
                ).snap(
                    `At path 1/a, tuple of length 3 is not assignable to tuple of length 2.`
                )
            })
            it("multiple", () => {
                assert(
                    mixed.validate([false, { a: [0, [0, 1, 2]] }]).error
                        ?.message
                ).snap(`Encountered errors at the following paths:
  0: false is not assignable to true.
  1/a/0: 0 is not assignable to string.
  1/a/1: Tuple of length 3 is not assignable to tuple of length 1.
`)
            })
        })
    })
    it("generation", () => {
        assert(mixed.generate()).equals([true, { a: ["", [0]] }])
    })
})
