import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import {
    writeMissingRightOperandMessage,
    writeUnresolvableMessage
} from "../../src/parse/string/shift/operand/unenclosed.js"
import { attest } from "../attest/main.js"

suite("tuple expression", () => {
    test("nested", () => {
        const t = type(["string|bigint", "|", ["number", "|", "boolean"]])
        attest(t.infer).typed as string | number | bigint | boolean
    })
    test("autocompletion", () => {
        // @ts-expect-error
        attest(() => type([""])).types.errors(
            `IndexZeroOperator | keyof Ark | "this"`
        )
        // @ts-expect-error
        attest(() => type(["string", ""])).types.errors(
            `"keyof" | keyof Ark | "this" | IndexOneOperator'`
        )
    })
    suite("errors", () => {
        test("missing right operand", () => {
            // @ts-expect-error
            attest(() => type(["string", "|"])).throwsAndHasTypeError(
                writeMissingRightOperandMessage("|", "")
            )
            // @ts-expect-error
            attest(() => type(["string", "&"])).throwsAndHasTypeError(
                writeMissingRightOperandMessage("&", "")
            )
        })
        test("nested parse error", () => {
            attest(() => {
                // @ts-expect-error
                type(["string", "|", "numbr"])
            }).throwsAndHasTypeError(writeUnresolvableMessage("numbr"))
        })
        test("nested object parse error", () => {
            attest(() => {
                // @ts-expect-error
                type([{ s: "strng" }, "|", "number"])
            }).throwsAndHasTypeError(writeUnresolvableMessage("strng"))
        })
    })
})
