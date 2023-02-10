import { describe, it } from "mocha"
import { type } from "../api.js"
import { attest } from "../dev/attest/api.js"

describe("traverse", () => {
    it("divisible", () => {
        const t = type("number%2")
        attest(t(4).data).snap(4)
        attest(t(5).problems?.summary).snap("Must be a multiple of 2 (was 5)")
    })
    it("range", () => {
        const t = type("number>2")
        attest(t(3).data).snap(3)
        attest(t(2).problems?.summary).snap("Must be greater than 2 (was 2)")
    })
    it("domain", () => {
        const t = type("number")
        attest(t(5).data).snap(5)
        attest(t("foo").problems?.summary).snap("Must be a number (was string)")
    })
    it("regex", () => {
        const t = type("/.*@arktype.io/")
        attest(t("shawn@arktype.io").data).snap("shawn@arktype.io")
        attest(t("shawn@hotmail.com").problems?.summary).snap(
            "Must be a string matching /.*@arktype.io/ (was 'shawn@hotmail.com')"
        )
    })
    it("required keys", () => {
        const t = type({
            name: "string",
            age: "number",
            "title?": "string"
        })
        attest(t({ name: "Shawn", age: 99 }).data).snap({
            name: "Shawn",
            age: 99
        })
        attest(t({ name: "Shawn" }).problems?.summary).snap(
            "age must be defined"
        )
    })
    it("custom errors", () => {
        const isEven = type("number%2", {
            divisor: {
                mustBe: (divisor) => `a multiple of ${divisor}`,
                writeReason: (mustBe, was) => `${was} is not ${mustBe}!`
            }
        })
        attest(isEven(3).problems?.summary).snap("3 is not a multiple of 2!")
    })
    it("domains", () => {
        const basic = type("string|number[]")
        const check = basic(2)
        attest(check.problems?.summary).snap(
            "Must be a string or an object (was number)"
        )
    })
    it("tuple length", () => {
        const t = type(["string", "number", "string", "string[]"])
        const data: typeof t.infer = ["foo", 5, "boo", []]
        attest(t(data).data).equals(data)
        attest(t(["hello"]).problems?.summary).snap(
            "Item at index 1 must be defined\nItem at index 2 must be defined\nItem at index 3 must be defined\nlength must be 4 (was 1)"
        )
    })
    it("branches", () => {
        const t = type([{ a: "string" }, "|", { b: "boolean" }])
        attest(t({ a: "ok" }).data).snap({ a: "ok" })
        attest(t({ b: true }).data).snap({ b: true })
        attest(t({}).problems?.summary).snap(
            "a must be defined or b must be defined (was {})"
        )
    })
    it("branches at path", () => {
        const t = type({ key: [{ a: "string" }, "|", { b: "boolean" }] })
        attest(t({ key: { a: "ok" } }).data).snap({ key: { a: "ok" } })
        attest(t({ key: { b: true } }).data).snap({ key: { b: true } })
        attest(t({ key: {} }).problems?.summary).snap(
            "At key, a must be defined or b must be defined (was {})"
        )
    })
    it("switch", () => {
        const t = type([{ a: "string" }, "|", { a: "boolean" }])
        attest(t({ a: "ok" }).data).snap({ a: "ok" })
        attest(t({ a: true }).data).snap({ a: true })
        // value isn't present
        attest(t({}).problems?.summary).snap(
            "a must be a string or boolean (was undefined)"
        )
        // unsatisfying value
        attest(t({ a: 5 }).problems?.summary).snap(
            "a must be a string or boolean (was number)"
        )
    })
    it("multi", () => {
        const naturalNumber = type("integer>0")
        attest(naturalNumber(-1.2).problems?.summary).snap(
            "-1.2 must be...\n• an integer\n• greater than 0"
        )
        const naturalAtPath = type({
            natural: naturalNumber
        })
        attest(naturalAtPath({ natural: -0.1 }).problems?.summary).snap(
            "At natural, -0.1 must be...\n• an integer\n• greater than 0"
        )
    })
})
