import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../index.js"

describe("parse", () => {
    describe("single", () => {
        test(">", () => {
            assert(type("number>0").tree).typedValue(["number", [">", 0]])
        })
        test("<", () => {
            assert(type("number<10").tree).typedValue(["number", ["<", 10]])
        })
        test(">=", () => {
            assert(type("number>=3.14159").tree).typedValue([
                "number",
                [">=", 3.14159]
            ])
        })
        test("<=", () => {
            assert(type("number<=-49").tree).typedValue(["number", ["<=", -49]])
        })
        test("==", () => {
            assert(type("number==3211993").tree).typedValue([
                "number",
                ["==", 3211993]
            ])
        })
    })
    describe("double", () => {
        test("<,<=", () => {
            assert(type("-5<number<=5").tree).typedValue([
                "number",
                [">", -5],
                ["<=", 5]
            ])
        })
        test("<=,<", () => {
            assert(type("-3.23<=number<4.654").tree).typedValue([
                "number",
                [">=", -3.23],
                ["<", 4.654]
            ])
        })
    })
})
describe("string", () => {
    test("parse", () => {
        assert(type("1<string<=5").tree).typedValue([
            "string",
            [">", 1],
            ["<=", 5]
        ])
    })
})
describe("")
describe("generation", () => {
    test("unsupported", () => {
        assert(() => type("1<number<5").create()).throws.snap(
            `Error: Unable to generate a value for '1<number<5': Bound generation is unsupported.`
        )
    })
})
