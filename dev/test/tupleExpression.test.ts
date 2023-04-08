import { describe, it } from "mocha"
import { type } from "../../src/main.js"
import {
    writeMissingRightOperandMessage,
    writeUnresolvableMessage
} from "../../src/parse/string/shift/operand/unenclosed.js"
import { attest } from "../attest/main.js"

describe("tuple expression", () => {
    it("union", () => {
        const t = type(["string", "|", "number"])
        attest(t.infer).typed as string | number
        attest(t.node).snap({ string: true, number: true })
    })
    it("intersection", () => {
        const t = type([{ a: "string" }, "&", { b: "number" }])
        attest(t.infer).typed as {
            a: string
            b: number
        }
        attest(t.node).snap({
            object: { props: { a: "string", b: "number" } }
        })
    })
    it("list", () => {
        const t = type(["string", "[]"])
        attest(t.infer).typed as string[]
        attest(t.node).snap({
            object: {
                instance: "(function Array)",
                props: { "[index]": "string" }
            }
        })
    })
    it("nested union", () => {
        const t = type(["string|bigint", "|", ["number", "|", "boolean"]])
        attest(t.infer).typed as string | number | bigint | boolean
        attest(t.node).snap({
            string: true,
            number: true,
            boolean: true,
            bigint: true
        })
    })
    describe("errors", () => {
        it("missing right operand", () => {
            // @ts-expect-error
            attest(() => type(["string", "|"])).throwsAndHasTypeError(
                writeMissingRightOperandMessage("|", "")
            )
            // @ts-expect-error
            attest(() => type(["string", "&"])).throwsAndHasTypeError(
                writeMissingRightOperandMessage("&", "")
            )
        })
        it("nested parse error", () => {
            attest(() => {
                // @ts-expect-error
                type(["string", "|", "numbr"])
            }).throwsAndHasTypeError(writeUnresolvableMessage("numbr"))
        })
        it("nested object parse error", () => {
            attest(() => {
                // @ts-expect-error
                type([{ s: "strng" }, "|", "number"])
            }).throwsAndHasTypeError(writeUnresolvableMessage("strng"))
        })
    })
})
