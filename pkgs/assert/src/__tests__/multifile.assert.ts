import { assert } from ".."

export const multifile = describe("multifile", () => {
    test("gathers types across files", () => {
        assert({ i: "love my wife" }).typed as { i: string }
        expect(
            () => assert({ g: "whiz" as unknown }).typed as { g: string }
        ).toThrow("unknown")
    })
})
