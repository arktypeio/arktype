import { assert } from "@re-/assert"
import { create } from "@re-/model"
import { typeDefProxy } from "../internal.js"

export const testIntegration = () => {
    describe("type", () => {
        test("union of lists", () => {
            assert(create("boolean[]|number[]|null").type).typed as
                | boolean[]
                | number[]
                | null
        })
        test("union of literals", () => {
            assert(create("'yes'|'no'|'maybe'").type).typed as
                | "yes"
                | "no"
                | "maybe"
        })
        test("literal of unions", () => {
            assert(create('"yes|no|maybe"').type).typed as "yes|no|maybe"
        })
    })
    test("model props", () => {
        const a = create("a", {
            space: { dictionary: { a: "true" } }
        })
        expect(a.definition).toBe("a")
        expect(a.space).toStrictEqual({ dictionary: { a: "true" } })
        expect(a.validate(true).error).toBeFalsy()
        expect(() => a.assert(false)).toThrow()
        expect(a.generate()).toBe(true)
        expect(a.type).toBe(typeDefProxy)
    })
}
