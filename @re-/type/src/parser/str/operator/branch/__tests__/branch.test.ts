import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../../index.js"

describe("branch", () => {
    test("intersection parsed before union", () => {
        // TODO: Implement a more natural way to represent escape characters
        assert(type("'0'|'1'&'2'|'3'").tree).narrowedValue([
            ['"0"', "|", ['"1"', "&", '"2"']],
            "|",
            '"3"'
        ])
    })
})
