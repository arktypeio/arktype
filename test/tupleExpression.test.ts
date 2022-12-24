import { describe, it } from "mocha"
import { attest } from "../dev/attest/exports.ts"
import { type } from "../exports.ts"
import {
    buildMissingRightOperandMessage,
    buildUnresolvableMessage
} from "../src/parse/string/shift/operand/unenclosed.ts"

describe("tuple expression", () => {
    it("union", () => {
        const t = type(["string", "|", "number"])
        attest(t.infer).typed as string | number
        attest(t.root).snap({ string: true, number: true })
    })
    it("intersection", () => {
        const t = type([{ a: "string" }, "&", { b: "number" }])
        attest(t.infer).typed as {
            a: string
            b: number
        }
        attest(t.root).snap({
            object: { props: { a: "string", b: "number" } }
        })
    })
    it("list", () => {
        const t = type(["string", "[]"])
        attest(t.infer).typed as string[]
        attest(t.root).snap({ object: { subdomain: ["Array", "string"] } })
    })
    it("nested union", () => {
        const t = type(["string|bigint", "|", ["number", "|", "boolean"]])
        attest(t.infer).typed as string | number | bigint | boolean
        attest(t.root).snap({
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
                buildMissingRightOperandMessage("|", "")
            )
            // @ts-expect-error
            attest(() => type(["string", "&"])).throwsAndHasTypeError(
                buildMissingRightOperandMessage("&", "")
            )
        })
        it("nested parse error", () => {
            attest(() => {
                // @ts-expect-error
                type(["string", "|", "numbr"])
            }).throwsAndHasTypeError(buildUnresolvableMessage("numbr"))
        })
        it("nested object parse error", () => {
            attest(() => {
                // @ts-expect-error
                type([{ s: "strng" }, "|", "number"])
            }).throwsAndHasTypeError(buildUnresolvableMessage("strng"))
        })
    })
})
