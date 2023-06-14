import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import { node } from "../../src/nodes/composite/type.js"
import type { Out } from "../../src/parse/ast/morph.js"
import {
    writeMissingRightOperandMessage,
    writeUnresolvableMessage
} from "../../src/parse/string/shift/operand/unenclosed.js"
import { attest } from "../attest/main.js"

suite("tuple expression definition", () => {
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

suite("args tuple expression", () => {
    test("prefix", () => {
        const t = type("keyof", "Date")
        attest(t.infer).typed as keyof Date
        attest(t.condition).equals(node({ basis: Date }).keyof().condition)
    })
    test("postfix", () => {
        const t = type({ a: "string" }, "[]")
        attest(t.infer).typed as { a: string }[]
        attest(t.condition).equals(type({ a: "string" }).array().condition)
    })
    test("infix", () => {
        const t = type({ a: "string" }, "|", { b: "boolean" })
        attest(t.infer).typed as string | number
        attest(t.condition).equals(
            type({ a: "string" }).or({ b: "boolean" }).condition
        )
    })
    test("morph", () => {
        const t = type({ a: "string" }, "=>", (In) => ({ b: In.a }))
        attest(t.infer).typed as (In: { a: string }) => Out<{
            b: string
        }>
    })
    test("narrow", () => {
        const t = type(
            { a: "string" },
            ":",
            (In): In is { a: "foo" } => In.a === "foo"
        )
        attest(t.infer).typed as { a: "foo" }
    })
})
