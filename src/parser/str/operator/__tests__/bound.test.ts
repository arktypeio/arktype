import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../../api.js"
import { BoundOperator } from "../bound/bound.js"
import { LeftBoundOperator } from "../bound/left.js"
import { Comparator } from "../bound/tokens.js"

//TODO: Add tests for mid definitions/multiple bounds
describe("bound", () => {
    describe("parse", () => {
        describe("single", () => {
            test(">", () => {
                attest(type("number>0").ast).narrowedValue(["number", ">", "0"])
            })
            test("<", () => {
                attest(type("number<10").ast).narrowedValue([
                    "number",
                    "<",
                    "10"
                ])
            })
            test(">=", () => {
                attest(type("number>=3.14159").ast).narrowedValue([
                    "number",
                    ">=",
                    "3.14159"
                ])
            })
            test("<=", () => {
                attest(type("number<=-49").ast).narrowedValue([
                    "number",
                    "<=",
                    "-49"
                ])
            })
            test("==", () => {
                attest(type("number==3211993").ast).narrowedValue([
                    "number",
                    "==",
                    "3211993"
                ])
            })
        })
        describe("double", () => {
            test("<,<=", () => {
                attest(type("-5<number<=5").ast).narrowedValue([
                    "-5",
                    "<",
                    ["number", "<=", "5"]
                ])
            })
            test("<=,<", () => {
                attest(type("-3.23<=number<4.654").ast).narrowedValue([
                    "-3.23",
                    "<=",
                    ["number", "<", "4.654"]
                ])
            })
        })
        describe("errors", () => {
            test("single equals", () => {
                // @ts-expect-error
                attest(() => type("string=5")).throwsAndHasTypeError(
                    BoundOperator.singleEqualsMessage
                )
            })
            test("invalid left comparator", () => {
                // @ts-expect-error
                attest(() => type("3>number<5")).throwsAndHasTypeError(
                    Comparator.buildInvalidDoubleMessage(">")
                )
            })
            test("invalid right double-bound comparator", () => {
                // @ts-expect-error
                attest(() => type("3<number==5")).throwsAndHasTypeError(
                    Comparator.buildInvalidDoubleMessage("==")
                )
            })
            test("unpaired left", () => {
                // @ts-expect-error
                attest(() => type("3<number")).throwsAndHasTypeError(
                    LeftBoundOperator.buildUnpairedMessage("number", "3", "<")
                )
            })
            test("double left", () => {
                // @ts-expect-error
                attest(() => type("3<5<8")).throwsAndHasTypeError(
                    LeftBoundOperator.buildBoundLiteralMessage("5", "3", "<")
                )
            })
        })
    })
})
