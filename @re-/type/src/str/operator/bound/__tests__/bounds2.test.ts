import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../index.js"

describe("parse", () => {
    describe("single", () => {
        test(">", () =>
            assert(type("number>0").tree).typedValue(["number", [[">", 0]]]))
    })
})

describe("generation", () => {
    test("unsupported", () => {
        assert(() => type("1<number<5").create()).throws.snap(
            `Error: Unable to generate a value for '1<number<5': Bound generation is unsupported.`
        )
    })
})
