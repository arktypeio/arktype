import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import { node } from "../../src/nodes/composite/type.js"
import { writeIndivisibleMessage } from "../../src/parse/ast/divisor.js"
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
        attest(nary.condition).is(expected.condition)
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
    test("length stress", () => {
        // as of TS 5.1, can handle a max of 46 branches before an inifinitely
        // deep error not the end of the world if this changes slightly, but
        // wanted to make those changes explicit if something reduces it it's
        // also still very responsive up until it hits the limit, so it is
        // likely a safeguard rather than a limitation of the parser
        const t = type(
            "0|1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18|19|20|21|22|23|24|25|26|27|28|29|30|31|32|33|34|35|36|37|38|39|40|41|42|43|44|45"
        )
        attest(t.infer).types.toString.snap()
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
        test("left semantic error", () => {
            // @ts-expect-error
            attest(() => type("symbol%2|string")).throwsAndHasTypeError(
                writeIndivisibleMessage("symbol")
            )
        })
        test("right semantic error", () => {
            // @ts-expect-error
            attest(() => type("string|symbol%2")).throwsAndHasTypeError(
                writeIndivisibleMessage("symbol")
            )
        })
        test("chained bad reference", () => {
            // @ts-expect-error
            attest(() => type("string").or("nummer")).throwsAndHasTypeError(
                writeUnresolvableMessage("nummer")
            )
        })
    })
})
