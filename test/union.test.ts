import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"
import {
    buildMissingRightOperandMessage,
    buildUnresolvableMessage
} from "../src/parse/shift/operand/unenclosed.js"

describe("union/parse", () => {
    test("binary", () => {
        const binary = type("number|string")
        attest(binary.infer).typed as number | string
        attest(binary.root).snap({ number: true, string: true })
    })
    test("nary", () => {
        const nary = type("false|null|undefined|0|''")
        attest(nary.infer).typed as false | "" | 0 | null | undefined
        attest(nary.root).snap({
            boolean: { literal: false },
            string: { literal: "" },
            number: { literal: 0 },
            null: true,
            undefined: true
        })
    })
    test("union of true and false reduces to boolean", () => {
        attest(type("true|false").root).equals("boolean")
        attest(type("true|false|number").root).equals({
            boolean: true,
            number: true
        })
    })
    describe("errors", () => {
        test("bad reference", () => {
            // @ts-expect-error
            attest(() => type("number|strng")).throwsAndHasTypeError(
                buildUnresolvableMessage("strng")
            )
        })
        test("consecutive tokens", () => {
            // @ts-expect-error
            attest(() => type("boolean||null")).throwsAndHasTypeError(
                buildMissingRightOperandMessage("|", "|null")
            )
        })
        test("ends with |", () => {
            // @ts-expect-error
            attest(() => type("boolean|")).throwsAndHasTypeError(
                buildMissingRightOperandMessage("|", "")
            )
        })
        test("long missing union member", () => {
            attest(() =>
                // @ts-expect-error
                type("boolean[]|(string|number|)|object")
            ).throwsAndHasTypeError(
                buildMissingRightOperandMessage("|", ")|object")
            )
        })
    })
})
