import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../api.js"
import { Bounds } from "../bounds/bound.js"
import { LeftBound } from "../bounds/left.js"
import { buildInvalidDoubleMessage } from "../bounds/shared.js"

//TODO: Add tests for mid definitions/multiple bounds
describe("bound", () => {
    describe("parse", () => {
        describe("single", () => {
            test(">", () => {
                attest(type("number>0").infer).typed as number
            })
            test("<", () => {
                attest(type("number<10").infer).typed as number
            })
            test(">=", () => {
                attest(type("number>=3.14159").infer).typed as number
            })
            test("<=", () => {
                attest(type("number<=-49").infer).typed as number
            })
            test("==", () => {
                attest(type("number==3211993").infer).typed as number
            })
        })
        describe("double", () => {
            test("<,<=", () => {
                attest(type("-5<number<=5").infer).typed as number
            })
            test("<=,<", () => {
                attest(type("-3.23<=number<4.654").infer).typed as number
            })
        })
        describe("errors", () => {
            test("single equals", () => {
                // @ts-expect-error
                attest(() => type("string=5")).throwsAndHasTypeError(
                    Bounds.singleEqualsMessage
                )
            })
            test("invalid left comparator", () => {
                // @ts-expect-error
                attest(() => type("3>number<5")).throwsAndHasTypeError(
                    buildInvalidDoubleMessage(">")
                )
            })
            test("invalid right double-bound comparator", () => {
                // @ts-expect-error
                attest(() => type("3<number==5")).throwsAndHasTypeError(
                    buildInvalidDoubleMessage("==")
                )
            })
            test("unpaired left", () => {
                // @ts-expect-error
                attest(() => type("3<number")).throwsAndHasTypeError(
                    LeftBound.buildUnpairedMessage(">3")
                )
            })
            test("double left", () => {
                // @ts-expect-error
                attest(() => type("3<5<8")).throwsAndHasTypeError(
                    LeftBound.buildBoundLiteralMessage("5", ">3")
                )
            })
        })
    })
})
