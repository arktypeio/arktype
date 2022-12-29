import { describe, test } from "mocha"
import { attest } from "../dev/attest/api.ts"
import { type } from "../api.ts"

describe("check errors", () => {
    test("divisible", () => {
        const t = type("number%2")
        const checked = t(3)
        attest(checked.problems?.summary).snap("[] 3 is not divisible by 2")
    })
    test("divisible", () => {
        const t = type("number%2")
        const checked = t(4)
        attest(checked).snap({ data: 4 })
    })
    test("string length", () => {
        const gte3 = type("string>=3")
        attest(gte3.check("yes").problems).equals(undefined)
    })
    test("tuple length", () => {
        const gte3 = type("string[]>=3")
        attest(gte3.check(["abc", "def"]).problems?.summary).snap(
            "Value must be >= 3 (was 2)"
        )
    })
    test("range", () => {
        const t = type("number>2")
        const checked = t.check(2, {
            customError: `Houston we have an error`
        })
        attest(checked.problems?.summary).snap("Houston we have an error")

        //TODO separate tests
        const checked1 = t.check(2)
        attest(checked1.problems?.summary).snap("Value must be > 2 (was 2)")

        const checked2 = t.check(3)
        attest(checked2.data).snap(3)
        attest(checked2.problems?.summary).equals(undefined)
    })
    test("domain", () => {
        const t = type("number>2")

        attest(t.check("hellop").problems?.summary).snap(
            "Expected: number (was 'string')"
        )
    })
    test("regex", () => {
        const t = type("/\\w@hotmail.com/")
        const checked = t.check("shawn@hotail.com")
        attest(checked.problems?.summary).snap(
            "shawn@hotail.com does not match /\\w@hotmail.com/"
        )
    })

    test("required keys", () => {
        const t = type({
            name: "string",
            age: "number"
        })
        const checked = t.check({ name: "Shawn" })
        attest(checked.problems?.summary).snap(
            "age expected: string (was 'undefined')"
        )
    })
})
