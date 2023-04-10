import { AssertionError } from "node:assert"
import { describe, it } from "mocha"
import { type } from "../../src/main.ts"
import { ArkTypeError } from "../../src/traverse/problems.ts"
import { attest } from "arktype-attest"

describe("type utilities", () => {
    it("allows", () => {
        const t = type("number%2")
        const data: unknown = 4
        if (t.allows(data)) {
            // narrows correctly
            attest(data).typed as number
        } else {
            throw new Error()
        }
        attest(t.allows(5)).equals(false)
    })
    it("problems can be thrown", () => {
        const t = type("number")
        try {
            attest(t("invalid").problems?.throw())
        } catch (e) {
            attest(e instanceof ArkTypeError).equals(true)
            return
        }
        throw new AssertionError({ message: "Expected to throw" })
    })
})
