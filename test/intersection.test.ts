import { describe, it } from "mocha"
import { attest } from "../dev/attest/exports.ts"
import { type } from "../exports.ts"
import {
    buildMissingRightOperandMessage,
    buildUnresolvableMessage
} from "../src/parse/string/shift/operand/unenclosed.ts"

describe("intersection", () => {
    describe("parse", () => {
        it("two types", () => {
            const t = type("boolean&true")
            attest(t.infer).typed as true
            attest(t.root).snap({ boolean: { value: true } })
        })
        it("several types", () => {
            const t = type("unknown&boolean&false")
            attest(t.infer).typed as false
            attest(t.root).snap({ boolean: { value: false } })
        })
        describe("number & literals", () => {
            it("same literal", () => {
                attest(type("2&2").root).snap({ number: { value: 2 } })
            })
            it("literal&number type", () => {
                attest(type("number&22").root).snap({
                    number: { value: 22 }
                })
            })
            it("float&number type", () => {
                attest(type("number&22.22").root).snap({
                    number: { value: 22.22 }
                })
            })
        })
        describe("string & literal", () => {
            it("string", () => {
                attest(type("string&'a'").root).snap({ string: { value: "a" } })
            })
        })

        describe("errors", () => {
            it("bad reference", () => {
                // @ts-expect-error
                attest(() => type("boolean&tru")).throwsAndHasTypeError(
                    buildUnresolvableMessage("tru")
                )
            })
            it("double and", () => {
                // @ts-expect-error
                attest(() => type("boolean&&true")).throwsAndHasTypeError(
                    buildMissingRightOperandMessage("&", "&true")
                )
            })
            it("never", () => {
                // TODO: Top-level never?
                attest(type("string&number").root).snap({})
            })
        })
    })
})
