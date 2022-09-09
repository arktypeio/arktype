import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../../index.js"

describe("obj integration", () => {
    const mixed = () => type(["true", { a: ["string", ["number|boolean[]"]] }])
    test("type", () => {
        assert(mixed().infer).typed as [
            true,
            {
                a: [string, [number | boolean[]]]
            }
        ]
    })
    describe("validation", () => {
        test("standard", () => {
            assert(mixed().check([true, { a: ["ok", [0]] }]).errors).is(
                undefined
            )
        })
        describe("errors", () => {
            test("single", () => {
                assert(
                    mixed().check([
                        true,
                        { a: ["ok", [[true, false]], "extraElement"] }
                    ]).errors?.summary
                ).snap(
                    `At path 1/a, tuple of length 3 is not assignable to tuple of length 2.`
                )
            })
            test("multiple", () => {
                assert(
                    mixed().check([false, { a: [0, [0, 1, 2]] }]).errors
                        ?.summary
                ).snap(`Encountered errors at the following paths:
  0: false is not assignable to true.
  1/a/0: 0 is not assignable to string.
  1/a/1: Tuple of length 3 is not assignable to tuple of length 1.
`)
            })
        })
    })
    test("generation", () => {
        assert(mixed().create()).equals([true, { a: ["", [0]] }])
    })
})
