import { describe, it } from "mocha"
import { type, union } from "../../src/main.js"
import {
    writeMissingRightOperandMessage,
    writeUnresolvableMessage
} from "../../src/parse/string/shift/operand/unenclosed.js"
import { attest } from "arktype-attest"

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
    it("subtype pruning", () => {
        const t = type([{ a: "string" }, "|", { a: "'foo'" }])
        attest(t.node).snap({ object: { props: { a: "string" } } })
    })
    it("union of true and false reduces to boolean", () => {
        attest(type("true|false").node).equals({ boolean: true })
        attest(type("true|false|number").node).equals({
            boolean: true,
            number: true
        })
    })
    it("helper", () => {
        const t = union({ a: "string" }, { b: "boolean" })
        attest(t.infer).typed as
            | {
                  a: string
              }
            | {
                  b: boolean
              }
        attest(t.node).snap({
            object: [{ props: { a: "string" } }, { props: { b: "boolean" } }]
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
            attest(() => type("boolean||null")).throws(
                writeMissingRightOperandMessage("|", "|null")
            )
        })
        it("ends with |", () => {
            // @ts-expect-error
            attest(() => type("boolean|")).throws(
                writeMissingRightOperandMessage("|", "")
            )
        })
        it("long missing union member", () => {
            attest(() =>
                // @ts-expect-error
                type("boolean[]|(string|number|)|object")
            ).throws(writeMissingRightOperandMessage("|", ")|object"))
        })
        it("helper bad reference", () => {
            // @ts-expect-error
            attest(() => union("string", "nummer")).throwsAndHasTypeError(
                writeUnresolvableMessage("nummer")
            )
        })
    })
})
