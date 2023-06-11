import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import { node } from "../../src/nodes/composite/type.js"
import {
    writeMissingRightOperandMessage,
    writeUnresolvableMessage
} from "../../src/parse/string/shift/operand/unenclosed.js"
import { attest } from "../attest/main.js"

suite("union", () => {
    test("binary", () => {
        const binary = type("number|string")
        attest(binary.infer).typed as number | string
        // attest(binary.node).snap({ number: true, string: true })
    })
    test("nary", () => {
        const nary = type("false|null|undefined|0|''")
        attest(nary.infer).typed as false | "" | 0 | null | undefined
        const expected = node.literal(
            false as const,
            null,
            undefined,
            0 as const,
            "" as const
        )
        attest(nary.root).is(expected)
    })
    test("subtype pruning", () => {
        type([{ a: "string" }, "|", { a: "'foo'" }])
    })
    test("multiple subtypes pruned", () => {
        const t = type("'foo'|'bar'|string|'baz'|/.*/")
        attest(t.infer).typed as string
        attest(t.condition).is(type("string").condition)
    })
    test("union of true and false reduces to boolean", () => {})
    test("tuple expression", () => {
        const t = type([{ a: "string" }, "|", { b: "boolean" }])
        attest(t.infer).typed as { a: string } | { b: boolean }
    })
    test("chained", () => {
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
    suite("errors", () => {
        test("bad reference", () => {
            // @ts-expect-error
            attest(() => type("number|strng")).throwsAndHasTypeError(
                writeUnresolvableMessage("strng")
            )
        })
        test("consecutive tokens", () => {
            // @ts-expect-error
            attest(() => type("boolean||null")).throws(
                writeMissingRightOperandMessage("|", "|null")
            )
        })
        test("ends with |", () => {
            // @ts-expect-error
            attest(() => type("boolean|")).throws(
                writeMissingRightOperandMessage("|", "")
            )
        })
        test("long missing union member", () => {
            attest(() =>
                // @ts-expect-error
                type("boolean[]|(string|number|)|object")
            ).throws(writeMissingRightOperandMessage("|", ")|object"))
        })
        test("nested tuple union", () => {
            const t = type(["string|bigint", "|", ["number", "|", "boolean"]])
            attest(t.infer).typed as string | number | bigint | boolean
            // attest(t.node).snap({
            //     string: true,
            //     number: true,
            //     boolean: true,
            //     bigint: true
            // })
        })
        test("chained bad reference", () => {
            // @ts-expect-error
            attest(() => type("string").or("nummer")).throwsAndHasTypeError(
                writeUnresolvableMessage("nummer")
            )
        })
    })
})
