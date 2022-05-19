import { assert } from "@re-/assert"
import { assertThrows } from "@deno/std/testing/asserts.ts"
const { test } = Deno

test("gathers types across files", () => {
    assert({ i: "love my wife" }).typed as { i: string }
    assertThrows(
        () => assert({ g: "whiz" as unknown }).typed as { g: string },
        undefined,
        "unknown"
    )
})
