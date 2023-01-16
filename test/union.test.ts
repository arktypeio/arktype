import { describe, it } from "mocha"
import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import {
    writeMissingRightOperandMessage,
    writeUnresolvableMessage
} from "../src/parse/string/shift/operand/unenclosed.ts"

describe("union/parse", () => {
    it("binary", () => {
        const binary = type("number|string")
        attest(binary.infer).typed as number | string
        attest(binary.node).snap({ number: true, string: true })
    })
    it("nary", () => {
        const nary = type("false|null|undefined|0|''")
        attest(nary.infer).typed as false | "" | 0 | null | undefined
        attest(nary.node).snap({
            boolean: {
                value: false
            },
            null: true,
            undefined: true,
            number: {
                value: 0
            },
            string: {
                value: ""
            }
        })
    })
    it("union of true and false reduces to boolean", () => {
        attest(type("true|false").node).equals({ boolean: true })
        attest(type("true|false|number").node).equals({
            boolean: true,
            number: true
        })
    })
    it("subtype pruning", () => {
        const t = type([
            [{ a: "boolean" }, "|", { a: "true" }],
            "|",
            { a: "false" }
        ])
        attest(t.node).snap({
            object: { props: { a: "boolean" } }
        })
    })
    describe("errors", () => {
        it("bad reference", () => {
            // @ts-expect-error
            attest(() => type("number|strng")).throwsAndHasTypeError(
                writeUnresolvableMessage("strng")
            )
        })
        it("consecutive tokens", () => {
            // @ts-expect-error
            attest(() => type("boolean||null")).throwsAndHasTypeError(
                writeMissingRightOperandMessage("|", "|null")
            )
        })
        it("ends with |", () => {
            // @ts-expect-error
            attest(() => type("boolean|")).throwsAndHasTypeError(
                writeMissingRightOperandMessage("|", "")
            )
        })
        it("long missing union member", () => {
            attest(() =>
                // @ts-expect-error
                type("boolean[]|(string|number|)|object")
            ).throwsAndHasTypeError(
                writeMissingRightOperandMessage("|", ")|object")
            )
        })
    })
})
