import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"

describe("check errors", () => {
    test("divisible", () => {
        const t = type("number%2")
        const checked = t.check(3, { customError: "poop is not allowed" })
        attest(checked).snap({ problems: "poop is not allowed" })
    })
    test("range", () => {
        const t = type("number>2")
        const checked = t.check(2)
        attest(checked).snap({
            problems: [{ path: "range", reason: "2 does not conform to range" }]
        })
    })
    test("subdomain", () => {
        const t = type("number>2")
        const checked = t.check("hello")
        attest(checked).snap()
    })
})
