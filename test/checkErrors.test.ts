import { describe, test } from "mocha"
import { attest } from "../dev/attest/api.ts"
import { type } from "../api.ts"

describe("check errors", () => {
    test("divisible", () => {
        const t = type("number%2")
        const checked = t(3)
        attest(checked.problems?.summary).snap()
    })
    test("divisible", () => {
        const t = type("number%2")
        const checked = t(4)
        attest(checked).snap()
    })
    test("string length", () => {
        const gte3 = type("string>=3")
        attest(gte3("yes").problems).equals(undefined)
    })
    test("tuple length", () => {
        const gte3 = type(["string", "number", "string"])

        attest(gte3(["abc", "def"]).problems?.summary).snap()
    })
    test("range", () => {
        const t = type("number>2")

        //TODO separate tests
        const checked1 = t(2)
        attest(checked1.problems?.summary).snap()

        const checked2 = t(3)
        attest(checked2.data).snap(3)
        attest(checked2.problems?.summary).equals(undefined)
    })
    test("domain", () => {
        const t = type("number>2")

        attest(t("hellop").problems?.summary).snap()
    })
    test("regex", () => {
        const t = type("/\\w@hotmail.com/")
        const checked = t("shawn@hotail.com")
        attest(checked.problems?.summary).snap()
    })

    test("required keys", () => {
        const t = type({
            name: "string",
            age: "number"
        })
        const User = t.infer
        const checked = t({ name: "Shawn" })
        attest(checked.problems?.summary).snap()
    })
    // TODOSHAWN All tests under here
    test("optional keys", () => {
        const t = type({
            name: "string",
            "age?": "number"
        })
        const checked = t({ age: 22 })
        attest(checked.problems?.summary).snap()
    })

    test("tuple length", () => {
        const t = type("any[]>2")
        const checked = t(["abc", 1])
        attest(checked)
    })
})
