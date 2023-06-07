import { suite, test } from "mocha"
import { scope, type } from "../../src/main.js"
import { writeInvalidDivisorMessage } from "../../src/parse/string/shift/operator/divisor.js"
import type { Ark } from "../../src/scopes/ark.js"
import type { Generic } from "../../src/type.js"
import { attest } from "../attest/main.js"
import { lazily } from "./utils.js"

suite("generics", () => {
    suite("standalone generic", () => {
        test("unary", () => {
            const boxOf = type("<t>", { box: "t" })
            attest(boxOf).typed as Generic<
                ["t"],
                {
                    box: "t"
                },
                Ark
            >
            const schrodingersBox = boxOf({ cat: { isAlive: "boolean" } })
            attest(schrodingersBox.infer).typed as {
                box: { cat: { isAlive: boolean } }
            }
        })
        test("binary", () => {
            const either = type("<first, second>", "first|second")
            attest(either).typed as Generic<
                ["first", "second"],
                "first|second",
                Ark
            >
            const schrodingersBox = either(
                { cat: { isAlive: "true" } },
                { cat: { isAlive: "false" } }
            )
            attest(schrodingersBox.infer).typed as
                | {
                      cat: {
                          isAlive: true
                      }
                  }
                | {
                      cat: {
                          isAlive: false
                      }
                  }
            // ideally this would be reduced to { cat: { isAlive: boolean } }:
            // https://github.com/arktypeio/arktype/issues/751
        })
        test("referenced in scope", () => {
            const t = type("<t>", "t[]")
            const types = scope({
                arrayOf: t
            }).export()
            const stringArray = types.arrayOf("string")
            attest(stringArray.infer).typed as string[]
        })
        test("referenced in scope inline", () => {
            const $ = scope({
                one: "1",
                orOne: () => $.type("<t>", "t|1")
            })
            const types = $.export()
            const bit = types.orOne("0")
            attest(bit.infer).typed as 0 | 1
        })
        test("referenced from other scope", () => {
            // This should work to inline directly without a thunk, but
            // causes an infinite recursion:
            // https://github.com/arktypeio/arktype/issues/787
            const types = scope({
                arrayOf: () => type("<t>", "t[]")
            }).export()
            const stringArray = types.arrayOf("string")
            attest(stringArray.infer).typed as string[]
        })
    })

    suite("in-scope", () => {
        const $ = lazily(() =>
            scope({
                "box<t,u>": {
                    box: "t|u"
                },
                bitBox: "box<0,1>"
            })
        )
        const types = lazily(() => $.export())

        test("referenced in scope", () => {
            attest(types.bitBox).typed as {
                box: 0 | 1
            }
        })

        test("nested this", () => {
            type Expected = {
                box:
                    | 0
                    | 1
                    | {
                          box: "one" | "zero" | Expected
                      }
            }
            const t = $.type("box<0|1, box<'one'|'zero', this>>")
            attest(t.infer).typed as Expected
        })

        test("right bounds", () => {
            // should be able to differentiate between > that is part of a right
            // bound and > that closes a generic instantiation
            const t = $.type("box<number>5, string>=7>")
            attest(t.infer).typed as { box: string | number }
        })

        test("parameter supercedes alias with same name", () => {
            const types = scope({
                "box<foo>": {
                    box: "foo|bar"
                },
                foo: "'foo'",
                bar: "'bar'"
            }).export()
            const t = types.box("'baz'")
            attest(t.infer).typed as { box: "bar" | "baz" }
        })

        test("self-reference", () => {
            const types = scope({
                "alternate<a, b>": {
                    // ensures old generic params aren't intersected with
                    // updated values (would be never)
                    swap: "alternate<b, a>",
                    order: ["a", "b"]
                },
                reference: "alternate<0, 1>"
            }).export()
            attest(types.reference.infer.swap.swap.order).typed as [0, 1]
            attest(types.reference.infer.swap.swap.swap.order).typed as [1, 0]
        })

        test("declaration and instantiation leading and trailing whitespace", () => {
            const types = scope({
                "box< a , b >": {
                    box: " a | b "
                },
                actual: "  box  < 'foo'  ,   'bar'  > "
            }).export()
            attest(types.actual.infer).typed as { box: "foo" | "bar" }
        })

        test("allows external scope reference to be resolved", () => {
            const types = scope({
                external: "'external'",
                "orExternal<t>": "t|external"
            }).export()
            const b = scope({
                orExternal: types.orExternal,
                internal: "orExternal<'internal'>"
            }).export()
            attest(b.internal.infer).typed as "internal" | "external"
        })

        suite("parse errors", () => {
            test("empty string in declaration", () => {
                attest(() =>
                    scope({
                        // @ts-expect-error
                        "box<t,,u>": "string"
                    })
                ).throwsAndHasTypeError(
                    "An empty string is not a valid generic parameter name"
                )
            })
            test("too few args", () => {
                attest(() =>
                    // @ts-expect-error
                    $.type("box<0,box<1,number%0>>")
                ).throwsAndHasTypeError(
                    "box<t, u> requires exactly 2 parameters (got 1: 2|3)"
                )
            })
            test("too many args", () => {
                attest(() =>
                    // @ts-expect-error
                    $.type("box<0|1, box<2, 3, 4>>")
                ).throwsAndHasTypeError(writeInvalidDivisorMessage(0))
            })
            test("semantic", () => {
                attest(() =>
                    // @ts-expect-error
                    $.type("box<0,box<1,number%0>>")
                ).throwsAndHasTypeError(writeInvalidDivisorMessage(0))
            })
        })
    })
})
