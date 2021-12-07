import { assert } from ".."

describe("multifile", () => {
    test("gathers types from multiple files", () => {
        assert({ i: "love my wife" }).typed as { i: string }
        expect(
            () => assert({ g: "whiz" as unknown }).typed as { g: string }
        ).toThrow("unknown")
    })
})
