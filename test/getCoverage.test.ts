import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"
import { stringIntersection } from "../src/nodes/types/string.js"

describe("number", () => {
    test("literals same literal intersection", () => {
        attest(type("2&2").root).snap({ number: { literal: 2 } })
    })
    test("number gcd", () => {
        attest(type("number%2&number%3").root).snap({ number: { divisor: 6 } })
    })
})
describe("obj", () => {
    //alias in a scope
    test("literals same literal intersection", () => {
        type a = { a: string }
        type b = { b: string }
        attest("a&b").snap()
    })
})
