import { assert } from "@re-/assert"
import { create } from "@re-/model"
import { lazily } from "@re-/tools"
import { testMap } from "./map.assert.js"
import { testTuple } from "./tuple.assert.js"

export const testObj = () => {
    describe("map", testMap)
    describe("tuple", testTuple)
    describe("integration", () => {
        const mixed = lazily(() =>
            create(["true", { a: ["string", ["number|boolean[]"]] }])
        )
        test("type", () => {
            assert(mixed.type).typed as [
                true,
                {
                    a: [string, [number | boolean[]]]
                }
            ]
        })
        describe("validation", () => {
            test("standard", () => {
                assert(mixed.validate([true, { a: ["ok", [0]] }]).errors).is(
                    undefined
                )
            })
            describe("errors", () => {
                test("single", () => {
                    assert(
                        mixed.validate([
                            true,
                            { a: ["ok", [[true, false]], "extraElement"] }
                        ]).errors
                    ).snap(
                        `"At path 1/a, tuple of length 3 is not assignable to tuple of length 2."`
                    )
                })
                test("multiple", () => {
                    assert(
                        mixed.validate([false, { a: [0, [0, 1, 2]] }]).errors
                    ).snap(
                        `"{0: 'false is not assignable to true.', 1/a/0: '0 is not assignable to string.', 1/a/1: 'Tuple of length 3 is not assignable to tuple of length 1.'}"`
                    )
                })
            })
        })
        test("generation", () => {
            assert(mixed.generate()).equals([true, { a: ["", [0]] }])
        })
    })
}
