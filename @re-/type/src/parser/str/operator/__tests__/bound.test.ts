import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../../../api.js"
import { singleEqualsMessage } from "../bound/comparator.js"
import { unpairedLeftBoundMessage } from "../bound/left.js"
import { unboundableMessage } from "../bound/right.js"
import { invalidDoubleBoundMessage } from "../bound/tokens.js"

//TODO: Add tests for mid definitions/multiple bounds
describe("bound", () => {
    describe("parse", () => {
        describe("single", () => {
            test(">", () => {
                assert(type("number>0").ast).narrowedValue([
                    "number",
                    ":",
                    [[">", 0]]
                ])
            })
            test("<", () => {
                assert(type("number<10").ast).narrowedValue([
                    "number",
                    ":",
                    [["<", 10]]
                ])
            })
            test(">=", () => {
                assert(type("number>=3.14159").ast).narrowedValue([
                    "number",
                    ":",
                    [[">=", 3.14159]]
                ])
            })
            test("<=", () => {
                assert(type("number<=-49").ast).narrowedValue([
                    "number",
                    ":",
                    [["<=", -49]]
                ])
            })
            test("==", () => {
                assert(type("number==3211993").ast).narrowedValue([
                    "number",
                    ":",
                    [["==", 3211993]]
                ])
            })
        })
        describe("double", () => {
            test("<,<=", () => {
                assert(type("-5<number<=5").ast).narrowedValue([
                    "number",
                    ":",
                    [
                        [">", -5],
                        ["<=", 5]
                    ]
                ])
            })
            test("<=,<", () => {
                assert(type("-3.23<=number<4.654").ast).narrowedValue([
                    "number",
                    ":",
                    [
                        [">=", -3.23],
                        ["<", 4.654]
                    ]
                ])
            })
        })
        describe("errors", () => {
            test("single equals", () => {
                // @ts-expect-error
                assert(() => type("string=5")).throwsAndHasTypeError(
                    singleEqualsMessage
                )
            })
            test("invalid left comparator", () => {
                // @ts-expect-error
                assert(() => type("3>number<5")).throwsAndHasTypeError(
                    invalidDoubleBoundMessage(">")
                )
            })
            test("invalid right double-bound comparator", () => {
                // @ts-expect-error
                assert(() => type("3<number==5")).throwsAndHasTypeError(
                    invalidDoubleBoundMessage("==")
                )
            })
            test("unpaired left", () => {
                // @ts-expect-error
                assert(() => type("3<number")).throwsAndHasTypeError(
                    unpairedLeftBoundMessage("number", ">", 3)
                )
            })
            test("unboundable", () => {
                // @ts-expect-error
                assert(() => type("object|null>=10")).throwsAndHasTypeError(
                    unboundableMessage("null")
                )
            })
        })
        test("string", () => {
            assert(type("1<string<=5").ast).narrowedValue([
                "string",
                ":",
                [
                    [">", 1],
                    ["<=", 5]
                ]
            ])
        })
        test("parse", () => {
            assert(type("-343<=boolean[]<89").ast).narrowedValue([
                ["boolean", "[]"],
                ":",
                [
                    [">=", -343],
                    ["<", 89]
                ]
            ])
        })
    })
})
