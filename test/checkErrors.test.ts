import { describe, test } from "mocha"
import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"

describe("check errors", () => {
    test("divisible", () => {
        const t = type("number%2")
        attest(t(4).data).snap(4)
        attest(t(5).problems?.summary).snap("5 is not divisible by 2.")
    })
    test("string length", () => {
        const gte3 = type("string>=3")
        attest(gte3("yes").problems).equals(undefined)
    })

    test("range", () => {
        const t = type("number>2")

        //TODO separate tests
        const checked1 = t(2)
        attest(checked1.problems?.summary).snap(
            "Must be greater than 2 (got 2)."
        )

        const checked2 = t(3)
        attest(checked2.data).snap(3)
        attest(checked2.problems?.summary).equals(undefined)
    })
    test("domain", () => {
        const t = type("number>2")
        const checked = t("hellop")
        attest(checked.problems?.summary).snap(
            '"string" is not assignable to number.'
        )
    })
    test("regex", () => {
        const t = type("/\\w@hotmail.com/")
        const checked = t("shawn@hotail.com")
        attest(checked.problems?.summary).snap(
            "'shawn@hotail.com' must match expression //\\w@hotmail.com//."
        )
    })

    test("required keys", () => {
        const t = type({
            name: "string",
            age: "number"
        })
        const checked = t({ name: "Shawn" })
        attest(checked.problems?.summary).snap("age: age is required.")
    })
})
describe("", () => {
    test("tuple length", () => {
        const t = type(["string", "number", "string", "string[]"])
        const checked = t(["hello"])
        attest(checked.problems?.summary).snap(
            "1: 1 is required.\n2: 2 is required.\n3: 3 is required."
        )
    })
})
describe("custom errors", () => {
    test("divisor", () => {
        const isEven = type("number%2", {
            problems: {
                DivisorViolation: {
                    message: ({ divisor, value }) =>
                        `${value} is not even. (${value}%${divisor})`
                }
            }
        })
        const check = isEven(3)
        attest(check.problems?.summary).snap("3 is not even. (3%2)")
    })
})
