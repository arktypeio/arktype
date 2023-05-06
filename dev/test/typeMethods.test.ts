import { AssertionError } from "node:assert"
import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import { ArkTypeError } from "../../src/nodes/problems.js"
import { attest } from "../attest/main.js"

suite("type utilities", () => {
    test("allows", () => {
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
    test("problems can be thrown", () => {
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
