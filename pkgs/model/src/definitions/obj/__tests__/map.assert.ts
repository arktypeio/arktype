import { assert } from "@re-/assert"
import { define } from "@re-/model"

export const testMap = () => {
    describe("empty", () => {
        const { type, validate, generate } = define({})
        test("type", () => {
            assert(type).typed as {}
        })
        test("validation", () => {
            assert(validate({}).errors).is(undefined)
            assert(validate([]).errors).snap()
        })
        test("generation", () => {
            assert(generate()).equals({})
        })
    })
    describe("shallow", () => {
        const { type, validate, generate } = define({
            a: "string",
            b: "number",
            c: 6
        })
        test("type", () => {
            assert(type).typed as {
                a: string
                b: number
                c: 6
            }
        })
    })
    describe("nested", () => {
        const { type, validate, generate } = define({
            nested: {
                russian: "'doll'"
            }
        })
        test("type", () => {
            assert(type).typed as {
                nested: {
                    russian: "doll"
                }
            }
        })
    })
    describe("type", () => {
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
    describe("validation", () => {
        test("empty", () => {
            const { validate } = define({})
        })
    })
    describe("generation", () => {})
}
