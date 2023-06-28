import { suite, test } from "mocha"
import type { Scope, TypeSet } from "../../src/main.js"
import { scope, type } from "../../src/main.js"
import {
    writeNonScopeDotMessage,
    writeUnresolvableMessage
} from "../../src/parse/string/shift/operand/unenclosed.js"
import type { Ark } from "../../src/scopes/ark.js"
import { attest } from "../attest/main.js"

// can't use a proxy for this without breaking instanceof Scope
const $ = () =>
    scope({
        a: "string",
        b: "sub.alias",
        sub: scope({ alias: "number" }).export()
    })

suite("subscopes", () => {
    test("base", () => {
        const types = $().export()
        attest(types).typed as TypeSet<{
            exports: {
                a: string
                b: number
                sub: Scope<{
                    exports: {
                        alias: number
                    }
                    locals: {}
                    ambient: Ark
                }>
            }
            locals: {}
            ambient: Ark
        }>
        attest(types.sub.alias.infer).typed as number
        const expected = type("number").condition
        attest(types.sub.alias.condition).is(expected)
        attest(types.b.condition).is(expected)
    })
    test("non-scope dot access", () => {
        // @ts-expect-error
        attest(() => $().type("b.foo")).throwsAndHasTypeError(
            writeNonScopeDotMessage("b")
        )
    })
    test("thunk subscope", () => {
        const $ = scope({
            a: "string",
            c: "a",
            sub: () =>
                $.scope({
                    foo: "a",
                    bar: "foo"
                }).export()
        })
        attest($).typed as Scope<{
            exports: {
                a: string
                c: string
                sub: TypeSet<{
                    exports: {
                        foo: string
                        bar: string
                    }
                    locals: {}
                    ambient: Ark
                }>
            }
            locals: {}
            ambient: Ark
        }>
    })
    // test("no alias reference", () => {
    //     // TODO: fix, broken because of TypeSet being cached, shouldnt' be treated as resolution
    //     // @ts-expect-error
    //     attest(() => $().type("sub")).throwsAndHasTypeError(
    //         writeMissingSubscopeAccessMessage("sub")
    //     )
    // })
    test("bad alias reference", () => {
        // @ts-expect-error
        attest(() => $().type("sub.marine")).throwsAndHasTypeError(
            writeUnresolvableMessage("sub.marine")
        )
    })
    test("autocompletion", () => {
        const base = scope({ foo: "true" })
        // @ts-expect-error
        attest(() => scope({ base, reference: "base." }).export())
            .throws(writeUnresolvableMessage("base."))
            .types.errors("base.foo")
    })
    // TODO: private aliases
})
