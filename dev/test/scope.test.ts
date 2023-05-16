import { suite, test } from "mocha"
import { scope, type } from "../../src/main.js"
import { writeUnboundableMessage } from "../../src/parse/ast/bound.js"
import { writeUnresolvableMessage } from "../../src/parse/string/shift/operand/unenclosed.js"
import { writeUnexpectedCharacterMessage } from "../../src/parse/string/shift/operator/operator.js"
import { attest } from "../attest/main.js"

suite("scope", () => {
    test("base definition", () => {
        const types = scope({ a: "string" }).compile()
        attest(types.a.infer).typed as string
        attest(() =>
            // @ts-expect-error
            scope({ a: "strong" }).compile()
        ).throwsAndHasTypeError(writeUnresolvableMessage("strong"))
    })
    test("type definition", () => {
        const types = scope({ a: type("string") }).compile()
        attest(types.a.infer).typed as string
        attest(() =>
            // @ts-expect-error
            scope({ a: type("strong") })
        ).throwsAndHasTypeError(writeUnresolvableMessage("strong"))
    })
    test("interdependent", () => {
        const types = scope({
            a: "string>5",
            b: "email<=10",
            c: "a&b"
        }).compile()
        attest(types.c.infer).typed as string
    })
    test("object array", () => {
        const types = scope({ a: "string", b: [{ c: "a" }] }).compile()
        attest(types.b.infer).typed as [
            {
                c: string
            }
        ]
    })
    test("doesn't try to validate any in scope", () => {
        // const $ = scope({ a: {} as any })
        // attest($.infer).typed as { a: never }
        // attest($.type(["number", "a"]).infer).typed as [number, never]
    })
    test("infers input and output", () => {
        const $ = scope({
            a: ["string", "|>", (s) => s.length]
        })
        attest($.infer).typed as { a: number }
        attest($.inferIn).typed as { a: string }
    })
    test("scope.scope", () => {
        const $ = scope({
            a: "string"
        })
        const importer = $.scope({ b: "a[]" })
        attest(importer.infer).typed as { b: string[] }
        const t = importer.type("b")
        attest(t.root).is(type("string[]").root)
    })
    // test("extend", () => {
    //     const $ = scope({
    //         a: "string"
    //     }).extend({ b: "a[]" })
    //     attest($.infer).typed as {
    //         b: string[]
    //         a: string
    //     }
    //     const types = $.compile()
    //     attest(types.b.root).is(type("string[]").root)
    // })
    test("infers its own helpers", () => {
        const $ = scope({
            a: () => $.type("string"),
            b: () => $.type("number")
        })
        const types = $.compile()
        attest(types.a.infer).typed as string
        attest(types.b.infer).typed as number
    })
    test("allows semantically valid helpers", () => {
        const $ = scope({
            n: () => $.type("number"),
            lessThan10: () => $.type("n<10")
        })
        const types = $.compile()
        attest(types.n.infer).typed as number
        attest(types.lessThan10.infer).typed as number
    })
    test("errors on helper parse error", () => {
        attest(() => {
            const $ = scope({
                // @ts-expect-error
                a: () => $.type("kung|foo")
            })
            $.compile()
        }).throwsAndHasTypeError(writeUnresolvableMessage("kung"))
    })
    test("errors on semantically invalid helper", () => {
        attest(() => {
            const $ = scope({
                b: () => $.type("boolean"),
                // @ts-expect-error
                lessThan10: () => $.type("b<10")
            })
            $.compile()
        }).throwsAndHasTypeError(writeUnboundableMessage("'b'"))
    })
    test("errors on ridiculous unexpected alias scenario", () => {
        attest(() =>
            scope({
                Unexpected: {},
                User: {
                    // Previously, using the alias `Unexpected` allowed creating
                    // this type string which matched its own error message.
                    // @ts-expect-error
                    name: "Unexpected character 'c'"
                }
            }).compile()
        ).throwsAndHasTypeError(writeUnexpectedCharacterMessage("c"))
    })
})
