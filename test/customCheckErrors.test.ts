import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"

describe("check", () => {
    test("problems", () => {
        const t = type("number%2")
        const checked = t.check(3)
        attest(checked).snap()
    })
})
