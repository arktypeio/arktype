import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../api.js"
import { BoundOperator } from "../bound/bound.js"
import { LeftBoundOperator } from "../bound/left.js"
import { Comparators } from "../bound/tokens.js"

//TODO: Add tests for mid definitions/multiple bounds
describe("bound", () => {
    describe("parse", () => {
        describe("single", () => {
            test(">", () => {
                assert(type("number>0").toAst()).narrowedValue([
                    "number",
                    ">",
                    "0"
                ])
            })
            test("<", () => {
                assert(type("number<10").toAst()).narrowedValue([
                    "number",
                    "<",
                    "10"
                ])
            })
            test(">=", () => {
                assert(type("number>=3.14159").toAst()).narrowedValue([
                    "number",
                    ">=",
                    "3.14159"
                ])
            })
            test("<=", () => {
                assert(type("number<=-49").toAst()).narrowedValue([
                    "number",
                    "<=",
                    "-49"
                ])
            })
            test("==", () => {
                assert(type("number==3211993").toAst()).narrowedValue([
                    "number",
                    "==",
                    "3211993"
                ])
            })
        })
        describe("double", () => {
            test("<,<=", () => {
                assert(type("-5<number<=5").toAst()).narrowedValue([
                    "-5",
                    "<",
                    ["number", "<=", "5"]
                ])
            })
            test("<=,<", () => {
                assert(type("-3.23<=number<4.654").toAst()).narrowedValue([
                    "-3.23",
                    "<=",
                    ["number", "<", "4.654"]
                ])
            })
        })
        describe("errors", () => {
            test("single equals", () => {
                // @ts-expect-error
                assert(() => type("string=5")).throwsAndHasTypeError(
                    BoundOperator.singleEqualsMessage
                )
            })
            test("invalid left comparator", () => {
                // @ts-expect-error
                assert(() => type("3>number<5")).throwsAndHasTypeError(
                    Comparators.buildInvalidDoubleMessage(">")
                )
            })
            test("invalid right double-bound comparator", () => {
                // @ts-expect-error
                assert(() => type("3<number==5")).throwsAndHasTypeError(
                    Comparators.buildInvalidDoubleMessage("==")
                )
            })
            test("unpaired left", () => {
                // @ts-expect-error
                assert(() => type("3<number")).throwsAndHasTypeError(
                    LeftBoundOperator.buildUnpairedMessage("number", "3", "<")
                )
            })
            test("double left", () => {
                // @ts-expect-error
                assert(() => type("3<5<8")).throwsAndHasTypeError(
                    LeftBoundOperator.buildBoundLiteralMessage("5", "3", "<")
                )
            })
        })
    })
})
