import { suite, test } from "mocha"
import { node, type } from "../../src/main.js"
import { attest } from "../attest/main.js"

suite("literal", () => {
    suite("tuple expression", () => {
        test("literal", () => {
            const t = type(["===", 5])
            attest(t.infer).typed as 5
            attest(t.condition).equals(type("5").condition)
        })
        test("non-serializable", () => {
            const s = Symbol()
            const t = type(["===", s])
            attest(t.infer).typed as symbol
            // attest(t.node).equals({ symbol: { value: s } })
            attest(t(s).data).equals(s)
            attest(t("test").problems?.summary).snap(
                'Must be (symbol anonymous) (was "test")'
            )
        })
    })
    suite("root expression", () => {
        test("serializable", () => {
            const t = type("===", true)
            attest(t.infer).typed as true
            attest(t.condition).equals(type("true").condition)
        })
        test("non-serializable", () => {
            const s = Symbol()
            const t = type("===", s)
            attest(t.infer).typed as Error
            attest(t.condition).equals(node({ basis: ["===", s] }).condition)
        })
    })
    suite("method", () => {
        test("single literal", () => {
            const t = type("===", "foo")
            attest(t.infer).typed as "foo"
            attest(t.condition).equals(type("'foo'").condition)
        })
        test("literal branches", () => {
            const t = type("===", "foo", 5, true, null, 1n, undefined)
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
})
