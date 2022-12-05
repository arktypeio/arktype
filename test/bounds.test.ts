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
        test("whitespace following comparator", () => {
            const t = type("number > 3")
            attest(t.infer).typed as number
            attest(t.root).snap({
                type: "number",
                bounds: { min: { limit: 3, exclusive: true } }
            })
        })
        describe("single", () => {
            test(">", () => {
                const t = type("number>0")
                attest(t.infer).typed as number
                attest(t.root).snap({
                    type: "number",
                    bounds: { min: { limit: 0, exclusive: true } }
                })
            })
            test("<", () => {
                const t = type("number<10")
                attest(t.infer).typed as number
                attest(t.root).snap({
                    type: "number",
                    bounds: { max: { limit: 10, exclusive: true } }
                })
            })
            test(">=", () => {
                const t = type("number>=3.14159")
                attest(t.infer).typed as number
                attest(t.root).snap({
                    type: "number",
                    bounds: { min: { limit: 3.14159 } }
                })
            })
            test("<=", () => {
                const t = type("number<=-49")
                attest(t.infer).typed as number
                attest(t.root).snap({
                    type: "number",
                    bounds: { max: { limit: -49 } }
                })
            })
            test("==", () => {
                const t = type("number==3211993")
                attest(t.infer).typed as number
                attest(t.root).snap({
                    type: "number",
                    bounds: {
                        min: { limit: 3211993 },
                        max: { limit: 3211993 }
                    }
                })
            })
        })
        describe("double", () => {
            test("<,<=", () => {
                const t = type("-5<number<=5")
                attest(t.infer).typed as number
                attest(t.root).snap({
                    type: "number",
                    bounds: {
                        min: { limit: -5, exclusive: true },
                        max: { limit: 5 }
                    }
                })
            })
            test("<=,<", () => {
                const t = type("-3.23<=number<4.654")
                attest(t.infer).typed as number
                attest(t.root).snap({
                    type: "number",
                    bounds: {
                        min: { limit: -3.23 },
                        max: { limit: 4.654, exclusive: true }
                    }
                })
            })
        })
        describe("intersection", () => {
            test("<x & <=x", () => {
                attest(type("number<2&number<=2").root).snap({
                    type: "number",
                    bounds: { max: { limit: 2, exclusive: true } }
                })
            })
            test("<x & <x", () => {
                attest(type("number<2&number<2").root).snap({
                    type: "number",
                    bounds: { max: { limit: 2, exclusive: true } }
                })
            })
            test("<=x & <x", () => {
                attest(type("number<=2&number<2").root).snap({
                    type: "number",
                    bounds: { max: { limit: 2, exclusive: true } }
                })
            })
            test("<=x & <=x", () => {
                attest(type("number<=2&number<=2").root).snap({
                    type: "number",
                    bounds: { max: { limit: 2 } }
                })
            })
            describe("intersection strictness", () => {
                test("min limit x<y", () => {
                    attest(type("number>5&number>7").root).snap({
                        type: "number",
                        bounds: { min: { limit: 7, exclusive: true } }
                    })
                })
                test("min limit x>y", () => {
                    attest(type("number>9&number>7").root).snap({
                        type: "number",
                        bounds: { min: { limit: 9, exclusive: true } }
                    })
                })
                test("max limit x>y", () => {
                    attest(type("number<9&number<7").root).snap({
                        type: "number",
                        bounds: { max: { limit: 7, exclusive: true } }
                    })
                })
                test("max limit x<y", () => {
                    attest(type("number<7&number<9").root).snap({
                        type: "number",
                        bounds: { max: { limit: 7, exclusive: true } }
                    })
                })
            })
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
            test("empty range", () => {
                attest(type("number>3&number<2").root).snap("never")
            })
        })
    })
})
