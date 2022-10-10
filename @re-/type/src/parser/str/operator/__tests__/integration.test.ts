import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../api.js"

describe("branch", () => {
    test("intersection parsed before union", () => {
        assert(type("'0'|'1'&'2'|'3'").toAst()).narrowedValue([
            ["'0'", "|", ["'1'", "&", "'2'"]],
            "|",
            "'3'"
        ])
    })
})
