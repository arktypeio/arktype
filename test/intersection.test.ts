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
            attest(t.root).snap("true")
        })
        test("several types", () => {
            const t = type("unknown&boolean&false")
            attest(t.infer).typed as false
            attest(t.root).snap("false")
        })
        describe("number & literals", () => {
            test("same literal", () => {
                attest(type("2&2").root).snap({ number: { is: 2 } })
            })
            test("literal&number type", () => {
                attest(type("number&22").root).snap({
                    number: { is: 22 }
                })
            })
            test("float&number type", () => {
                attest(type("number&22.22").root).snap({
                    number: { is: 22.22 }
                })
            })
        })
        describe("string & literal", () => {
            attest(type("string&'a'").root).snap({ string: { is: "a" } })
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
            test("never", () => {
                // TODO: Top-level never?
                attest(type("string&number").root).snap({})
            })
        })
    })
})
