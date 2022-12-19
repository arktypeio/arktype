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
        attest(t.root).snap({ string: true, number: true })
    })
    test("intersection", () => {
        const t = type([{ a: "string" }, "&", { b: "number" }])
        attest(t.infer).typed as {
            a: string
            b: number
        }
        attest(t.root).snap({
            object: {
                props: { required: { a: "string", b: "number" } }
            }
        })
    })
    test("list", () => {
        const t = type(["string", "[]"])
        attest(t.infer).typed as string[]
        attest(t.root).snap({
            object: {
                kind: "Array",
                props: {
                    mapped: {
                        number: "string"
                    }
                }
            }
        })
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
    test("contrain", () => {
        const isOdd = (n: number) => n % 2 === 1
        const t = type(["number", ":", isOdd])
        attest(t.infer).typed as number
        // TODO: Have some way to represent external type node with unknown scope here?
        attest(t.root).equals({ number: { validator: isOdd as any } })
    })
    test("contraint parameter inference", () => {
        type Expected = number | string[]
        const constraintNumberOrStringArray = (data: Expected) => !!data
        const t = type(["number|string[]", ":", constraintNumberOrStringArray])
        attest(t.infer).typed as Expected
        attest(() => {
            // @ts-expect-error
            type(["number|boolean[]", ":", constraintNumberOrStringArray])
        }).type.errors("Type 'boolean' is not assignable to type 'string'.")
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
