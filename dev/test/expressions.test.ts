import { attest } from "@arktype/attest"
import type { Out } from "arktype"
import { node, type } from "arktype"
import { suite, test } from "mocha"
import {
    writeMissingRightOperandMessage,
    writeUnresolvableMessage
} from "../../src/parse/string/shift/operand/unenclosed.js"

suite("tuple expressions", () => {
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
        // TODO: reenable
        // test("this", () => {
        //     const t = type([{ a: "string" }, "|", { b: "this" }])
        //     attest(t.infer).types.toString.snap()
        //     const types = scope({
        //         a: {
        //             a: "string"
        //         },
        //         b: {
        //             b: "expected"
        //         },
        //         expected: "a|b"
        //     }).export()
        //     attest(t.condition).equals(types.expected.condition)
        // })
    })
})

suite("root expression", () => {
    test("=== single", () => {
        const t = type("===", 5)
        attest(t.infer).typed as 5
        attest(t.condition).equals(type("5").condition)
    })
    test("=== branches", () => {
        const t = type("===", "foo", "bar", "baz")
        attest(t.infer).typed as "foo" | "bar" | "baz"
        attest(t.condition).equals(node.literal("foo", "bar", "baz").condition)
    })
    test("instanceof single", () => {
        const t = type("instanceof", RegExp)
        attest(t.infer).typed as RegExp
        attest(t.condition).equals(node({ basis: RegExp }).condition)
    })
    test("instanceof branches", () => {
        const t = type("instanceof", Array, Date)
        attest(t.infer).typed as unknown[] | Date
        attest(t.condition).equals(
            node({ basis: Array }, { basis: Date }).condition
        )
    })
    test("postfix", () => {
        const t = type({ a: "string" }, "[]")
        attest(t.infer).typed as { a: string }[]
        attest(t.condition).equals(type({ a: "string" }).array().condition)
    })
    test("infix", () => {
        const t = type({ a: "string" }, "|", { b: "boolean" })
        attest(t.infer).typed as
            | {
                  a: string
              }
            | {
                  b: boolean
              }
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
    test("this", () => {
        const t = type({ a: "string" }, "|", { b: "this" })
        attest(t.infer).types.toString.snap(
            "{ a: string; } | { b: { a: string; } | any; }"
        )
        attest(t.condition).equals(
            type([{ a: "string" }, "|", { b: "this" }]).condition
        )
    })
    test("tuple as second arg", () => {
        // this case is not fundamentally unique but TS has a hard time
        // narrowing tuples in contexts like this
        const t = type("keyof", [
            { a: "string" },
            "&",
            { b: "boolean" }
            // as const is required for TS <=5.0
        ] as const)
        attest(t.infer).typed as "a" | "b"
    })
})
