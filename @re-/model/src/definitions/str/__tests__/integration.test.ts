import { assert } from "@re-/assert"
import { model } from "@re-/model"
import { narrow } from "@re-/tools"

describe("integration", () => {
    describe("type", () => {
        test("union of lists", () => {
            assert(model("boolean[]|number[]|null").type).typed as
                | boolean[]
                | number[]
                | null
        })
        test("union of literals", () => {
            assert(model("'yes'|'no'|'maybe'").type).typed as
                | "yes"
                | "no"
                | "maybe"
        })
        test("literal of unions", () => {
            assert(model('"yes|no|maybe"').type).typed as "yes|no|maybe"
        })
    })
    test("model props", () => {
        const a = model("a", {
            space: { dictionary: narrow({ a: "true" }) }
        })
        expect(a.definition).toBe("a")
        expect(a.validate(true).error).toBeFalsy()
        expect(() => a.assert(false)).toThrow()
        expect(a.generate()).toBe(true)
    })
})
