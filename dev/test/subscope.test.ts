import { suite, test } from "mocha"
import { lazily } from "../../dev/utils/src/main.js"
import type { Scope, TypeSet } from "../../src/main.js"
import { scope, type } from "../../src/main.js"
import {
    writeMissingSubscopeAccessMessage,
    writeNonScopeDotMessage,
    writeUnresolvableMessage
} from "../../src/parse/string/shift/operand/unenclosed.js"
import type { Ark } from "../../src/scopes/ark.js"
import { attest } from "../attest/main.js"

const $ = lazily(() =>
    scope({
        a: "string",
        b: "sub.alias",
        sub: scope({ alias: "number" }).export()
    })
)

suite("subscopes", () => {
    // TODO: update names to refer to modules
    test("base", () => {
        const types = $.export()
        attest(types).typed as TypeSet<{
            exports: {
                a: string
                b: number
                sub: TypeSet<{
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
        attest(() => $.type("b.foo")).throwsAndHasTypeError(
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
    test("no alias reference", () => {
        // @ts-expect-error
        attest(() => $.type("sub")).throwsAndHasTypeError(
            writeMissingSubscopeAccessMessage("sub")
        )
    })
    test("bad alias reference", () => {
        // @ts-expect-error
        attest(() => $.type("sub.marine")).throwsAndHasTypeError(
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
