import { assert } from "@re-/assert"
import { model } from "#api"
import { lazily } from "@re-/tools"

describe("integration", () => {
    const mixed = lazily(() =>
        model(["true", { a: ["string", ["number|boolean[]"]] }])
    )
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
                    ]).error
                ).snap(
                    `At path 1/a, tuple of length 3 is not assignable to tuple of length 2.`
                )
            })
            it("multiple", () => {
                assert(mixed.validate([false, { a: [0, [0, 1, 2]] }]).error)
                    .snap(`Encountered errors at the following paths:
{
  0: 'false is not assignable to true.',
  1/a/0: '0 is not assignable to string.',
  1/a/1: 'Tuple of length 3 is not assignable to tuple of length 1.'
}`)
            })
        })
    })
    it("generation", () => {
        assert(mixed.generate()).equals([true, { a: ["", [0]] }])
    })
})
