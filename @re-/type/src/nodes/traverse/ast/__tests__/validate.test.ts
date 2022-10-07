import { assert } from "@re-/assert"
import { describe } from "mocha"
import { type } from "../../../../type.js"

describe("validate", () => {
    describe("constraints", () => {
        test("string", () => {
            assert(type("string<=5").ast).narrowedValue(["string", "<=", "5"])
        })
        test("array", () => {
            assert(type("-343<=boolean[]<89").ast).narrowedValue([
                "-343",
                "<=",
                [["boolean", "[]"], "<", "89"]
            ])
        })
        test("any", () => {
            assert(type("any>5").ast).narrowedValue(["any", ">", "5"])
        })
        describe("errors", () => {
            test("bad type", () => {
                // @ts-expect-error
                assert(() => type("null<10")).throwsAndHasTypeError()
            })
            test("number literal", () => {
                // @ts-expect-error
                assert(() => type("5%10")).throwsAndHasTypeError()
            })
        })
    })
})
