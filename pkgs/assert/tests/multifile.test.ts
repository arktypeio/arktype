import { assert } from "@src/index.ts"
import { assertThrows } from "@deno/std/testing/asserts.ts"

Deno.test("gathers types across files", () => {
    assert({ i: "love my wife" }).typed as { i: string }
    assertThrows(
        () => assert({ g: "whiz" as unknown }).typed as { g: string },
        undefined,
        "unknown"
    )
})
