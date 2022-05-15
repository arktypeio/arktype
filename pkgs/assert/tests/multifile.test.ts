import { assert } from "../src/index.js"
import { assertThrows } from "@deno/testing"

Deno.test("gathers types across files", () => {
    assert({ i: "love my wife" }).typed as { i: string }
    assertThrows(
        () => assert({ g: "whiz" as unknown }).typed as { g: string },
        undefined,
        "unknown"
    )
})
