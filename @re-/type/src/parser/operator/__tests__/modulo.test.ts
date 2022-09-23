import { assert } from "@re-/assert"
import { test } from "mocha"
import { type } from "../../../type.js"

describe("modulo", () => {
    describe("Tree is properly set", () => {
        test("basic", () => {
            assert(type("number%2").tree).type.toString.snap(
                `["number", [["%", 2]]]`
            )
        })
    })
    describe("ERRORRRR", () => {
        test("Mod and suffix", () => {
            assert(type("number%>2").tree)
        })
    })
})
// const message = unexpectedSuffixMessage("?", "foobar", "number")
