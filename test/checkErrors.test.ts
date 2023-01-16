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
        attest(t(2).problems?.summary).snap("Must be greater than 2 (got 2).")
    })
    it("domain", () => {
        const t = type("number")
        const checked = t("hellop")
        attest(checked.problems?.summary).snap(
            '"hellop" is not assignable to number.'
        )
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
        attest(t.flat).snap([
            ["domain", "object"],
            [
                "requiredProps",
                [
                    ["name", "string"],
                    ["age", "number"]
                ]
            ]
        ])
        const checked = t({ name: "Shawn" })
        attest(checked.problems?.summary).snap("age: age is required.")
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
        attest(check.problems?.summary).snap()
    })
    it("domains", () => {
        const basic = type("string|number[]")
        const check = basic(2)
        attest(check.problems?.summary).snap(
            "2 is not assignable to string|object"
        )
    })
    it("tuple length", () => {
        const t = type(["string", "number", "string", "string[]"])
        const data: typeof t.infer = ["foo", 5, "boo", []]
        attest(t(data).data).equals(data)
        attest(t(["hello"]).problems?.summary).snap(
            "Tuple must have length 4 (got 1)."
        )
    })
})
