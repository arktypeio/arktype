import { strict } from "node:assert"
import { test } from "mocha"
import { assert } from "../index.js"

describe("multifile", () => {
    test("gathers types across files", () => {
        assert({ i: "love my wife" }).typed as { i: string }
        strict.throws(
            () => assert({ g: "whiz" as unknown }).typed as { g: string },
            strict.AssertionError,
            "unknown"
        )
    })
})
