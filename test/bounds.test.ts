import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"
import {
    buildMultipleLeftBoundsMessage,
    buildOpenRangeMessage,
    buildUnpairableComparatorMessage
} from "../src/parse/reduce/shared.js"
import { singleEqualsMessage } from "../src/parse/shift/operator/bounds.js"

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
        test("whitespace following comparator", () => {
            attest(type("number > 3").infer).typed as number
        })
        describe("errors", () => {
            test("single equals", () => {
                // @ts-expect-error
                attest(() => type("string=5")).throwsAndHasTypeError(
                    singleEqualsMessage
                )
            })
            test("invalid left comparator", () => {
                // @ts-expect-error
                attest(() => type("3>number<5")).throwsAndHasTypeError(
                    buildUnpairableComparatorMessage(">")
                )
            })
            test("invalid right double-bound comparator", () => {
                // @ts-expect-error
                attest(() => type("3<number==5")).throwsAndHasTypeError(
                    buildUnpairableComparatorMessage("==")
                )
            })
            test("unpaired left", () => {
                // @ts-expect-error
                attest(() => type("3<number")).throwsAndHasTypeError(
                    buildOpenRangeMessage(3, "<")
                )
            })
            test("double left", () => {
                // @ts-expect-error
                attest(() => type("3<5<8")).throwsAndHasTypeError(
                    buildMultipleLeftBoundsMessage(3, "<", 5, "<")
                )
            })
        })
    })
})
