import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../../index.js"

describe("branch", () => {
    test("intersection parsed before union", () => {
        assert(type("'0'|'1'&'2'|'3'").tree).narrowedValue([
            ["'0'", "|", ["'1'", "&", "'2'"]],
            "|",
            "'3'"
        ])
    })
})
