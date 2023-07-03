import { suite, test } from "mocha"
import { ark, scope, type } from "../../src/main.js"
import { writeUnresolvableMessage } from "../../src/parse/string/shift/operand/unenclosed.js"
import { attest } from "../attest/main.js"

suite("type references", () => {
    test("shallow type reference", () => {
        const t = type(type("boolean"))
        attest(t.infer).typed as boolean
    })

    test("bad shallow type reference", () => {
        attest(() => {
            // @ts-expect-error
            type(type("foolean"))
        }).throwsAndHasTypeError(writeUnresolvableMessage("foolean"))
    })

    test("deep type reference", () => {
        const t = type({ a: type("boolean") })
        attest(t.infer).typed as { a: boolean }
    })

    test("type reference in scope", () => {
        const a = type({ a: "string" })
        const $ = scope({ a })
        const types = $.export()
        attest(types.a.condition).equals(type({ a: "string" }).condition)
        attest(a.scope).is(ark)
        attest(types.a.scope).is($)
        attest(types.a.infer).typed as { a: string }
    })

    test("bad deep type reference", () => {
        attest(() => {
            // @ts-expect-error
            type({ a: type("goolean") })
        }).throwsAndHasTypeError(writeUnresolvableMessage("goolean"))
    })
})
