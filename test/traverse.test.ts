import { describe, it } from "mocha"
import { type } from "../api.js"
import { attest } from "../dev/attest/api.js"

describe("traverse", () => {
    it("divisible", () => {
        const t = type("number%2")
        attest(t(4).data).snap(4)
        attest(t(5).problems?.summary).snap("5 is not divisible by 2")
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
            '"shawn@hotail.com" must match expression /\\w@hotmail.com/'
        )
    })
    it("required keys", () => {
        const t = type({
            name: "string",
            age: "number"
        })
        const checked = t({ name: "Shawn" })
        // TODO: improve
        attest(checked.problems?.summary).snap("age: age is required")
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
    // TODO: improve error message, include subproblems
    it("branches", () => {
        const t = type([{ a: "string" }, "|", { b: "boolean" }])
        attest(t({ a: "ok" }).data).snap({ a: "ok" })
        attest(t({ b: true }).data).snap({ b: true })

        attest(t({}).problems?.summary).snap("{} does not satisfy any branches")
    })
    it("switch", () => {
        const t = type([{ a: "string" }, "|", { a: "boolean" }])
        attest(t({ a: "ok" }).data).snap({ a: "ok" })
        attest(t({ a: true }).data).snap({ a: true })
        // value isn't present
        attest(t({}).problems?.summary).snap(
            'a: "(undefined)" does not satisfy any branches'
        )
        // unsatisfying value
        attest(t({ a: 5 }).problems?.summary).snap(
            "a: 5 does not satisfy any branches"
        )
    })
})
