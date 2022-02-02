import { assert } from "@re-/assert"
import { define } from "@re-/model"

export const testMap = () => {
    describe("type", () => {
        test("empty", () => {
            assert(define({}).type).typed as {}
        })
        test("shallow", () => {
            assert(
                define({
                    a: "string",
                    b: "number",
                    c: 6
                }).type
            ).typed as {
                a: string
                b: number
                c: 6
            }
        })
        test("nested", () => {
            assert(
                define({
                    nested: {
                        russian: "'doll'"
                    }
                }).type
            ).typed as {
                nested: {
                    russian: "doll"
                }
            }
        })
        describe("errors", () => {
            test("invalid property", () => {
                // @ts-expect-error
                assert(() => define({ a: { b: "whoops" } }))
                    .throws(
                        "Unable to determine the type of 'whoops' at path a/b."
                    )
                    .type.errors("Unable to determine the type of 'whoops'")
            })
        })
    })
    describe("validation", () => {})
    describe("generation", () => {})
}
