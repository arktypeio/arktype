// import { it } from "@jest/globals"
import { assert } from "../src/index.js"
import { throws, AssertionError } from "node:assert/strict"

it("gathers types across files", () => {
    assert({ i: "love my wife" }).typed as { i: string }
    throws(
        () => assert({ g: "whiz" as unknown }).typed as { g: string },
        AssertionError,
        "unknown"
    )
})
