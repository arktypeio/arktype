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
            attest(t(s).data).equals(s)
            attest(t("test").problems?.summary).snap(
                'Must be (symbol anonymous) (was "test")'
            )
        })
        test("branches", () => {
            const o = { ark: true }
            const s = Symbol()
            const t = type(["===", true, "foo", 5, 1n, null, undefined, o, s])
            attest(t.infer).typed as
                | true
                | "foo"
                | 5
                | 1n
                | null
                | undefined
                | { ark: boolean }
                | typeof s
            attest(t.condition).equals(
                node.literal(true, "foo", 5, 1n, null, undefined, o, s)
                    .condition
            )
        })
    })
    suite("root expression", () => {
        test("single", () => {
            const t = type("===", true)
            attest(t.infer).typed as true
            attest(t.condition).equals(type("true").condition)
        })
        test("branches", () => {
            const o = { ark: true }
            const s = Symbol()
            const t = type("===", "foo", 5, true, null, 1n, undefined, o, s)
            attest(t.infer).typed as
                | true
                | "foo"
                | 5
                | 1n
                | null
                | undefined
                | { ark: boolean }
                | typeof s
            attest(t.condition).equals(
                node.literal(true, "foo", 5, 1n, null, undefined, o, s)
                    .condition
            )
        })
    })
})
