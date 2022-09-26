import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../type.js"
import { invalidSuffixMessage } from "../../parser/common.js"
import { indivisibleMessage, moduloByZeroMessage } from "../modulo.js"

describe("modulo", () => {
    describe("valid", () => {
        test("integerLiteralDefinition", () => {
            assert(type("number%2").tree).narrowedValue(["number", [["%", 2]]])
        })
        describe("moduloValueFollowedByOneCharSuffix", () => {
            test("%,?", () => {
                assert(type("number%10?").tree).narrowedValue([
                    ["number", [["%", 10]]],
                    "?"
                ])
            })
            test("%,>", () => {
                assert(type("number%10>2").tree).narrowedValue([
                    "number",
                    [
                        ["%", 10],
                        [">", 2]
                    ]
                ])
            })
            test("%,<", () => {
                assert(type("number%10>2").tree).narrowedValue([
                    "number",
                    [
                        ["%", 10],
                        [">", 2]
                    ]
                ])
            })
            test("<,%,<", () => {
                assert(type("2<number%10<4").tree).narrowedValue([
                    "number",
                    [
                        ["%", 10],
                        [">", 2],
                        ["<", 4]
                    ]
                ])
            })
        })
        describe("moduloValueFollowedByTwoCharSuffix", () => {
            test("%,==", () => {
                assert(type("number%2==0").tree).narrowedValue([
                    "number",
                    [
                        ["%", 2],
                        ["==", 0]
                    ]
                ])
            })
            test("%,<=", () => {
                assert(type("number%2<=4").tree).narrowedValue([
                    "number",
                    [
                        ["%", 2],
                        ["<=", 4]
                    ]
                ])
            })
            test("%,>=", () => {
                assert(type("number%2>=4").tree).narrowedValue([
                    "number",
                    [
                        ["%", 2],
                        [">=", 4]
                    ]
                ])
            })
            test("<=,%,<=", () => {
                assert(type("1<=number%2<=4").tree).narrowedValue([
                    "number",
                    [
                        ["%", 2],
                        [">=", 1],
                        ["<=", 4]
                    ]
                ])
            })
        })
    })
    describe("invalid", () => {
        test("moduloByZero", () => {
            // @ts-expect-error
            assert(() => type("number%0")).throwsAndHasTypeError(
                moduloByZeroMessage
            )
        })
        test("unexpectedSuffix", () => {
            // @ts-expect-error
            assert(() => type("number%foobar")).throwsAndHasTypeError(
                invalidSuffixMessage("%", "foobar", "an integer literal")
            )
        })
        test("indivisible", () => {
            // @ts-expect-error
            assert(() => type("string%2")).throwsAndHasTypeError(
                indivisibleMessage("string")
            )
        })
        test("non-integer", () => {
            // @ts-expect-error
            assert(() => type("number%2.3")).throwsAndHasTypeError(
                invalidSuffixMessage("%", "2.3", "an integer literal")
            )
        })
    })

    describe("generation", () => {
        test("unsupported", () => {
            assert(() => type("number%5").create()).throws.snap(
                `Error: Unable to generate a value for 'number%5': Constrained generation is not yet supported.`
            )
        })
    })
})
