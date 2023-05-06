import { describe, it } from "mocha"
import { type } from "../../src/main.js"
import {
    writeMissingRightOperandMessage,
    writeUnresolvableMessage
} from "../../src/parse/string/shift/operand/unenclosed.js"
import { attest } from "../attest/main.js"

describe("union", () => {
    it("binary", () => {
        const binary = type("number|string")
        attest(binary.infer).typed as number | string
        // attest(binary.node).snap({ number: true, string: true })
    })
    it("nary", () => {
        const nary = type("false|null|undefined|0|''")
        attest(nary.infer).typed as false | "" | 0 | null | undefined
        // attest(nary.node).snap({
        //     boolean: {
        //         value: false
        //     },
        //     null: true,
        //     undefined: true,
        //     number: {
        //         value: 0
        //     },
        //     string: {
        //         value: ""
        //     }
        // })
    })
    it("subtype pruning", () => {
        type([{ a: "string" }, "|", { a: "'foo'" }])
    })
    it("union of true and false reduces to boolean", () => {})
    it("tuple expression", () => {
        const t = type([{ a: "string" }, "|", { b: "boolean" }])
        attest(t.infer).typed as { a: string } | { b: boolean }
    })
    it("helper", () => {
        const t = type({ a: "string" }).or({ b: "boolean" })
        attest(t.infer).typed as
            | {
                  a: string
              }
            | {
                  b: boolean
              }
        // attest(t.node).snap({
        //     object: [{ props: { a: "string" } }, { props: { b: "boolean" } }]
        // })
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
        it("nested union", () => {
            const t = type(["string|bigint", "|", ["number", "|", "boolean"]])
            attest(t.infer).typed as string | number | bigint | boolean
            // attest(t.node).snap({
            //     string: true,
            //     number: true,
            //     boolean: true,
            //     bigint: true
            // })
        })
        it("helper bad reference", () => {
            // @ts-expect-error
            attest(() => type("string").or("nummer")).throwsAndHasTypeError(
                writeUnresolvableMessage("nummer")
            )
        })
    })
})
