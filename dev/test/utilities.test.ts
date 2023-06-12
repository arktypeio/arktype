import { AssertionError } from "node:assert"
import { suite, test } from "mocha"
import { ArkTypeError } from "../../src/compile/problems.js"
import { define, scope, type, Type } from "../../src/main.js"
import { writeUnresolvableMessage } from "../../src/parse/string/shift/operand/unenclosed.js"
import { attest } from "../attest/main.js"

suite("type utilities", () => {
    test("root discriminates", () => {
        const t = type("string")
        const { data, problems } = t("")
        if (problems) {
            problems.throw()
        } else {
            attest(data).typed as string
        }
    })
    test("allows", () => {
        const t = type("number%2")
        const data: unknown = 4
        if (t.allows(data)) {
            // narrows correctly
            attest(data).typed as number
        } else {
            throw new Error()
        }
        attest(t.allows(5)).equals(false)
    })
    suite("literal", () => {
        test("single literal", () => {
            const t = type.literal("foo")
            attest(t.infer).typed as "foo"
            attest(t.condition).equals(type("'foo'").condition)
        })
        test("literal branches", () => {
            const t = type.literal("foo", 5, true, null, 1n, undefined)
            attest(t.infer).typed as true | "foo" | 5 | 1n | null | undefined
            attest(t.condition).equals(
                type("'foo'|true|5|1n|null|undefined").condition
            )
        })
        test("type error on non-literalable", () => {
            // @ts-expect-error
            attest(type.literal({})).types.errors(
                "Argument of type '{}' is not assignable to parameter of type 'Literalable'."
            )
            // @ts-expect-error
            attest(type.literal(Symbol())).types.errors(
                "Argument of type 'Symbol' is not assignable to parameter of type 'Literalable'."
            )
        })
    })
    suite("instance", () => {
        test("single", () => {
            const t = type.instance(Type)
            attest(t.infer).typed as Type<unknown, unknown>
            attest(t.condition).snap("$arkRoot instanceof globalThis.$ark.Type")
        })
        test("instance branches", () => {
            const t = type.instance(Date, Map)
            attest(t.infer).typed as Date | Map<unknown, unknown>
            attest(t.condition).equals(type("Date|Map").condition)
        })
        test("type error on non-constructor", () => {
            // @ts-expect-error
            attest(type.instance({})).types.errors(
                "Argument of type '{}' is not assignable to parameter of type 'AbstractableConstructor'."
            )
        })
    })
    test("problems can be thrown", () => {
        const t = type("number")
        try {
            attest(t("invalid").problems?.throw())
        } catch (e) {
            attest(e instanceof ArkTypeError).equals(true)
            return
        }
        throw new AssertionError({ message: "Expected to throw" })
    })
})

suite("scope utilities", () => {
    suite("define", () => {
        test("ark", () => {
            const def = define({
                a: "string|number",
                b: ["boolean"],
                c: "this"
            })
            attest(def).typed as {
                a: "string|number"
                b: ["boolean"]
                c: "this"
            }
        })
        test("ark error", () => {
            // currently is a no-op, so only has type error
            // @ts-expect-error
            attest(define({ a: "boolean|foo" })).types.errors(
                writeUnresolvableMessage("foo")
            )
        })
        test("custom scope", () => {
            const $ = scope({
                a: "string[]"
            })
            const ok = $.define(["a[]|boolean"])
            attest(ok).typed as ["a[]|boolean"]
            // @ts-expect-error
            attest($.define({ not: "ok" })).types.errors(
                writeUnresolvableMessage("ok")
            )
        })
    })
})
