import { attest } from "@arktype/attest"
import { scope, type } from "arktype"
import { suite, test } from "mocha"
import { writeUnboundableMessage } from "../../src/parse/ast/bounds.js"
import { writeInvalidPropertyKeyMessage } from "../../src/parse/objectLiteral.js"
import { writeUnresolvableMessage } from "../../src/parse/string/shift/operand/unenclosed.js"

suite("object literal", () => {
    test("empty", () => {
        const o = type({})
        attest(o.condition).equals(type("object").condition)
    })
    test("required", () => {
        const o = type({ a: "string", b: "boolean" })
        attest(o.infer).typed as { a: string; b: boolean }
        attest(o.condition)
            .snap(`if (!(((typeof $arkRoot === "object" && $arkRoot !== null) || typeof $arkRoot === "function"))) {
        return false
}
$ark.object26($arkRoot.a)
$ark.object36($arkRoot.b)`)
    })
    test("optional keys", () => {
        const o = type({ "a?": "string", b: "boolean" })
        attest(o.infer).typed as { a?: string; b: boolean }
    })
    test("index", () => {
        const o = type({ "[string]": "string" })
        attest(o).typed as { [x: string]: string }
    })
    test("enumerable indexed union", () => {
        const o = type({ "['foo' | 'bar']": "string" })
        attest(o).typed as {
            foo: string
            bar: string
        }
    })
    test("non-enumerable indexed union", () => {
        const o = type({ "[string | symbol]": "string" })
        attest(o).typed as {
            [x: string]: string
            [x: symbol]: string
        }
    })
    test("multiple indexed", () => {
        const o = type({
            "[string]": "string",
            "[symbol]": "number"
        })
        attest(o).typed as {
            [x: string]: string
            [x: symbol]: number
        }
    })
    test("all key kinds", () => {
        const o = type({
            "[string]": "string",
            required: "'foo'",
            "optional?": "'bar'"
        })
        attest(o.infer).typed as {
            [x: string]: string
            required: "foo"
            optional?: "bar"
        }
    })
    test("index key from scope", () => {
        const types = scope({
            key: "symbol|'foo'|'bar'|'baz'",
            obj: {
                "[key]": "string"
            }
        }).export()
        type Key = symbol | "foo" | "bar" | "baz"
        attest(types.key.infer).typed as Key
        attest(types.obj.infer).typed as Record<Key, string>
    })
    test("syntax error in index definition", () => {
        attest(() =>
            type({
                // @ts-expect-error
                "[unresolvable]": "string"
            })
        ).throwsAndHasTypeError(writeUnresolvableMessage("unresolvable"))
    })

    test("does not allow syntax error message as value", () => {
        attest(() =>
            type({
                // @ts-expect-error
                "[unresolvable]": "'unresolvable' is unresolvable"
            })
        ).throwsAndHasTypeError(writeUnresolvableMessage("unresolvable"))
    })

    test("semantic error in index definition", () => {
        attest(() =>
            type({
                // @ts-expect-error
                "[symbol<5]": "string"
            })
        ).throwsAndHasTypeError(writeUnboundableMessage("symbol"))
    })

    test("invalid key type for index definition", () => {
        attest(() =>
            type({
                // @ts-expect-error
                "[object]": "string"
            })
        ).throwsAndHasTypeError(writeInvalidPropertyKeyMessage("object"))
    })

    test("does not allow invalid key type error as value", () => {
        attest(() =>
            type({
                // @ts-expect-error
                "[object]":
                    "Indexed key definition 'object' must be a string, number or symbol"
            })
        ).throwsAndHasTypeError(writeInvalidPropertyKeyMessage("object"))
    })

    test("nested", () => {
        const t = type({ "a?": { b: "boolean" } })
        attest(t.infer).typed as { a?: { b: boolean } }
    })
    test("intersections", () => {
        const a = { "a?": "string" } as const
        const b = { b: "string" } as const
        const c = { "c?": "string" } as const
        const abc = type(a).and(b).and(c)
        attest(abc.infer).typed as {
            a?: string
            b: string
            c?: string
        }
        attest(abc.condition).equals(type({ ...a, ...b, ...c }).condition)
        attest(abc.condition).equals(type([[a, "&", b], "&", c]).condition)
    })
    test("traverse optional", () => {
        const o = type({ "a?": "string" }).configure({ keys: "strict" })
        attest(o({ a: "a" }).data).snap({ a: "a" })
        attest(o({}).data).snap({})
        attest(o({ a: 1 }).problems?.summary).snap(
            "a must be a string (was number)"
        )
    })
    test("intersection", () => {
        const t = type({ a: "number" }).and({ b: "boolean" })
        // Should be simplified from {a: number} & {b: boolean} to {a: number, b: boolean}
        attest(t.infer).types.toString.snap("{ a: number; b: boolean; }")
        attest(t.condition).is(type({ a: "number", b: "boolean" }).condition)
    })
    test("escaped optional token", () => {
        const t = type({ "a\\?": "string" })
        attest(t.infer).typed as { "a?": string }
    })
    test("escaped index", () => {
        const o = type({ "\\[string]": "string" })
        attest(o.infer).typed as { "[string]": string }
    })
    test("multiple bad strict", () => {
        const t = type({ a: "string", b: "boolean" }).configure({
            keys: "strict"
        })
        attest(t({ a: 1, b: 2 }).problems?.summary).snap(
            "a must be a string (was number)\nb must be boolean (was number)"
        )
    })
})
