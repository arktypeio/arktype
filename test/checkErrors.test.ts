import { describe, it } from "mocha"
import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("check", () => {
    it("divisible", () => {
        const t = type("number%2")
        attest(t(4).data).snap(4)
        attest(t(5).problems?.summary).snap("5 is not divisible by 2.")
    })
    it("string length", () => {
        const gte3 = type("string>=3")
        attest(gte3("yes").problems).equals(undefined)
    })

    it("range", () => {
        const t = type("number>2")
        attest(t(3).data).snap(3)
        attest(t(2).problems?.summary).snap("Must be greater than 2 (was 2)")
    })
    it("domain", () => {
        const t = type("number")
        const checked = t("foo")
        attest(checked.problems?.summary).snap("Must be a number (was string)")
    })
    it("regex", () => {
        const t = type("/\\w@hotmail.com/")
        const checked = t("shawn@hotail.com")
        attest(checked.problems?.summary).snap(
            '"shawn@hotail.com" must match expression /\\w@hotmail.com/.'
        )
    })
    it("required keys", () => {
        const t = type({
            name: "string",
            age: "number"
        })
        const checked = t({ name: "Shawn" })
        attest(checked.problems?.summary).snap("/age: age is required")
    })
    it("custom errors", () => {
        const isEven = type("number%2", {
            problems: {
                divisibility: {
                    message: ({ data, divisor }) =>
                        `${data} is not disivible by ${divisor}!`
                }
            }
        })
        const check = isEven(3)
        attest(check.problems?.summary).snap("3 is not disivible by 2!")
    })
    // TODO: more domain tests
    it("domains", () => {
        const basic = type("string|number[]")
        const check = basic(2)
        attest(check.problems?.summary).snap(
            "Must either be a string or be an object (was number)"
        )
    })
    it("tuple length", () => {
        const t = type(["string", "number", "string", "string[]"])
        const data: typeof t.infer = ["foo", 5, "boo", []]
        attest(t(data).data).equals(data)
        attest(t(["hello"]).problems?.summary).snap(
            "Tuple must have length 4 (was 1)"
        )
    })
})
