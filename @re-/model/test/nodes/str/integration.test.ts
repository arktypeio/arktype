import { assert } from "@re-/assert"
import { model } from "#api"

describe("integration", () => {
    describe("type", () => {
        it("union of lists", () => {
            assert(model("boolean[]|number[]|null").type).typed as
                | boolean[]
                | number[]
                | null
        })
        it("union of literals", () => {
            assert(model("'yes'|'no'|'maybe'").type).typed as
                | "yes"
                | "no"
                | "maybe"
        })
        it("literal of unions", () => {
            assert(model('"yes|no|maybe"').type).typed as "yes|no|maybe"
        })
    })
})
