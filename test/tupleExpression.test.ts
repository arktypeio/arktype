import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"
import {
    buildMissingRightOperandMessage,
    buildUnresolvableMessage
} from "../src/parse/shift/operand/unenclosed.js"

describe("tuple expression", () => {
    test("union", () => {
        const t = type(["string", "|", "number"])
        attest(t.infer).typed as string | number
        attest(t.root).snap(["string", "number"])
    })
    test("intersection", () => {
        const t = type([{ a: "string" }, "&", { b: "number" }])
        attest(t.infer).typed as {
            a: string
            b: number
        }
        attest(t.root).snap({
            type: "object",
            children: {
                props: { b: "number", a: "string" },
                requiredKeys: { b: true, a: true }
            }
        })
    })
    test("list", () => {
        const t = type(["string", "[]"])
        attest(t.infer).typed as string[]
        attest(t.root).snap({
            type: "object",
            subtype: "array",
            children: {
                propTypes: {
                    number: "string"
                }
            }
        })
    })
    test("nested union", () => {
        const t = type(["string|bigint", "|", ["number", "|", "boolean"]])
        attest(t.infer).typed as string | number | bigint | boolean
        attest(t.root).snap(["string", "bigint", "number", "boolean"])
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
