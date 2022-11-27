import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"
import {
    buildMissingRightOperandMessage,
    buildUnresolvableMessage
} from "../src/parse/shift/operand/unenclosed.js"

describe("intersection", () => {
    describe("parse", () => {
        test("two types", () => {
            const t = type("boolean&true")
            attest(t.infer).typed as true
            attest(t.root).snap({ type: "boolean", value: true })
        })
        test("several types", () => {
            const t = type("unknown&boolean&false")
            attest(t.infer).typed as false
            attest(t.root).snap({ type: "boolean", value: false })
        })
        describe("errors", () => {
            test("bad reference", () => {
                // @ts-expect-error
                attest(() => type("boolean&tru")).throwsAndHasTypeError(
                    buildUnresolvableMessage("tru")
                )
            })
            test("double and", () => {
                // @ts-expect-error
                attest(() => type("boolean&&true")).throwsAndHasTypeError(
                    buildMissingRightOperandMessage("&", "&true")
                )
            })
        })
    })
})
