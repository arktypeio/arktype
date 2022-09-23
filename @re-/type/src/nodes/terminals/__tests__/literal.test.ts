import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../type.js"

describe("literal", () => {
    test("check", () => {
        assert(type("'dursurdo'").check("dursurdo").errors).is(undefined)
        assert(type("1n").check(1).errors?.summary).snap(`Must be 1n (was 1)`)
    })
    test("generate", () => {
        assert(type("1").create()).typedValue(1)
        assert(type("true").create()).typedValue(true)
    })
})
