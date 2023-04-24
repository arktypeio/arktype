import { describe, it } from "mocha"
import { scope, type } from "#arktype"
import { attest, getTsVersionUnderTest } from "#attest"
import { writeBadDefinitionTypeMessage } from "../../src/parse/definition.js"
import { writeUnresolvableMessage } from "../../src/parse/string/shift/operand/unenclosed.js"

describe("terminal objects", () => {
    it("regex", () => {
        const t = type(/.*/)
        attest(t.infer).typed as string
        attest(t.node).equals({ string: { regex: ".*" } })
    })
    describe("type", () => {
        it("shallow", () => {
            const t = type(type("boolean"))
            attest(t.infer).typed as boolean
            attest(() => {
                // @ts-expect-error
                type(type("foolean"))
            }).throwsAndHasTypeError(writeUnresolvableMessage("foolean"))
        })
        it("at path", () => {
            const t = type({ a: type("boolean") })
            attest(t.infer).typed as { a: boolean }
            attest(() => {
                // @ts-expect-error
                type({ a: type("goolean") })
            }).throwsAndHasTypeError(writeUnresolvableMessage("goolean"))
        })
    })
    describe("thunk", () => {
        it("thunk", () => {
            const t = type(() => type("boolean"))
            attest(t.infer).typed as boolean
            attest(() => {
                // @ts-expect-error
                type(() => type("moolean"))
            }).throwsAndHasTypeError(writeUnresolvableMessage("moolean"))
        })
        it("thunks in scope", () => {
            const $ = scope({
                a: () => $.type({ b: "b" }),
                b: { a: () => $.type({ a: "string" }) }
            })
            attest($.infer).typed as {
                a: {
                    b: {
                        a: {
                            a: string
                        }
                    }
                }
                b: {
                    a: {
                        a: string
                    }
                }
            }
            const types = $.compile()
            attest(types.a.infer).typed as {
                b: {
                    a: {
                        a: string
                    }
                }
            }
            attest(types.a.node).snap({ object: { props: { b: "b" } } })
            attest(types.b.infer).typed as {
                a: {
                    a: string
                }
            }
            attest(types.b.node).snap({
                object: { props: { a: { object: { props: { a: "string" } } } } }
            })
        })
        it("cyclic thunks in scope", () => {
            if (getTsVersionUnderTest() === "4.8") {
                // cyclic thunk inference is unsupported for TS versions <4.9
                return
            }
            const $ = scope({
                a: () => $.type({ b: "b" }),
                b: () => $.type({ a: "a" })
            })
            const types = $.compile()
            attest(types.a.infer).typed as {
                b: {
                    a: any
                }
            }
            attest(types.a.node).snap({ object: { props: { b: "b" } } })
            attest(types.b.infer).typed as {
                a: {
                    b: any
                }
            }
            attest(types.b.node).snap({ object: { props: { a: "a" } } })
        })
        it("expression from thunk", () => {
            const $ = scope({
                a: () => $.type({ a: "string" }),
                b: { b: "boolean" },
                aAndB: () => $.type("a&b")
            })
            const types = $.compile()
            attest(types.aAndB.infer).typed as {
                a: string
                b: boolean
            }
            attest(types.aAndB.node).snap({
                object: { props: { a: "string", b: "boolean" } }
            })
        })
        it("function requiring args in scope", () => {
            // @ts-expect-error it would be better if the error were in the def (instead we get a cyclic reference issue)
            const $ = scope({
                a: (t: true) => t && $.type("string")
            })
            attest(() => $.compile()).throws(
                writeBadDefinitionTypeMessage("Function")
            )
        })
        it("non-type thunk in scope", () => {
            const $ = scope({
                a: () => 42
            })
            attest(() => $.compile()).throws(
                writeBadDefinitionTypeMessage("Function")
            )
        })
        it("parse error in thunk in scope", () => {
            const $ = scope({
                // @ts-expect-error
                a: () => $.type("bad")
            })
            attest(() => $.compile()).throws(writeUnresolvableMessage("bad"))
        })
    })
})
