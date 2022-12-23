import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"

describe("check errors", () => {
    test("divisible", () => {
        const t = type("number%2")
        const checked = t.check(3)
        attest(checked).snap({
            problems: [
                { path: "[divisor,2]", reason: "3 is not divisible by 2" }
            ]
        })
    })
    test("divisible", () => {
        const t = type("number%2")
        const checked = t.check(4)
        attest(checked).snap({ data: 4 })
    })
    test("ok", () => {
        const gte3 = type("string>=3")
        attest(gte3.check("yes").problems).equals(undefined)
    })

    test("range", () => {
        // TODO: until a structure is defined for errors customError only accepts a string
        // once it's better defined there will be a clear idea of what Users can pass in for params if they want to
        // customize it based on the data that's being checked
        const t = type("number>2")
        const checked = t.check(2, {
            customError: ` Houston we have an error`
        })
        attest(checked).snap({
            problems: [
                {
                    path: "[range,[object Object]]",
                    reason: " Houston we have an error"
                }
            ]
        })
    })
    test("domain", () => {
        const t = type("number>2")

        attest(t.check("hellop").problems?.summary).snap(
            "string-number are not equivalent"
        )
    })
    test("regex", () => {
        const t = type("/\\w@hotmail.com/")
        const checked = t.check("shawn@hotail.com")
        attest(checked).snap({
            problems: [
                {
                    path: "regex",
                    reason: "shawn@hotail.com does not match /\\w@hotmail.com/"
                }
            ]
        })
    })
})
