import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"
import {
    buildMissingRightOperandMessage,
    buildUnresolvableMessage
} from "../src/parse/string/shift/operand/unenclosed.js"

describe("tuple expression", () => {
    test("union", () => {
        const t = type(["string", "|", "number"])
        attest(t.infer).typed as string | number
        attest(t.root).snap({ string: true, number: true })
    })
    test("intersection", () => {
        const t = type([{ a: "string" }, "&", { b: "number" }])
        attest(t.infer).typed as {
            a: string
            b: number
        }
        attest(t.root).snap({
            object: { props: { a: "string", b: "number" } }
        })
    })
    test("list", () => {
        const t = type(["string", "[]"])
        attest(t.infer).typed as string[]
        attest(t.root).snap({ object: { subdomain: ["Array", "string"] } })
    })
    test("nested union", () => {
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
        test("missing right operand", () => {
            // @ts-expect-error
            attest(() => type(["string", "|"])).throwsAndHasTypeError(
                buildMissingRightOperandMessage("|", "")
            )
            // @ts-expect-error
            attest(() => type(["string", "&"])).throwsAndHasTypeError(
                buildMissingRightOperandMessage("&", "")
            )
        })
        test("nested parse error", () => {
            attest(() => {
                // @ts-expect-error
                type(["string", "|", "numbr"])
            }).throwsAndHasTypeError(buildUnresolvableMessage("numbr"))
        })
        test("nested object parse error", () => {
            attest(() => {
                // @ts-expect-error
                type([{ s: "strng" }, "|", "number"])
            }).throwsAndHasTypeError(buildUnresolvableMessage("strng"))
        })
    })
})
