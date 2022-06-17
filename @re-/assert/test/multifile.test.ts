import { strict } from "node:assert"
import { assert } from "../src/index.js"

describe("multifile", () => {
    it("gathers types across files", () => {
        assert({ i: "love my wife" }).typed as { i: string }
        strict.throws(
            () => assert({ g: "whiz" as unknown }).typed as { g: string },
            strict.AssertionError,
            "unknown"
        )
    })
})
