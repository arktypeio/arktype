import { suite, test } from "mocha"
import { scope, type } from "../../src/main.js"
import { writeBadDefinitionTypeMessage } from "../../src/parse/definition.js"
import { writeUnresolvableMessage } from "../../src/parse/string/shift/operand/unenclosed.js"
import { attest } from "../attest/main.js"

suite("thunk", () => {
    // test("thunk", () => {
    //     const t = type(() => type("boolean"))
    //     attest(t.infer).typed as boolean
    //     attest(() => {
    //         // @ts-expect-error
    //         type(() => type("moolean"))
    //     }).throwsAndHasTypeError(writeUnresolvableMessage("moolean"))
    // })
    // test("thunks in scope", () => {
    //     const $ = scope({
    //         a: () => $.type({ b: "b" }),
    //         b: { a: () => $.type({ a: "string" }) }
    //     })
    //     attest($.infer).typed as {
    //         a: {
    //             b: {
    //                 a: {
    //                     a: string
    //                 }
    //             }
    //         }
    //         b: {
    //             a: {
    //                 a: string
    //             }
    //         }
    //     }
    //     const types = $.compile()
    //     attest(types.a.infer).typed as {
    //         b: {
    //             a: {
    //                 a: string
    //             }
    //         }
    //     }
    //     // attest(types.a.node).snap({ object: { props: { b: "b" } } })
    //     attest(types.b.infer).typed as {
    //         a: {
    //             a: string
    //         }
    //     }
    //     // attest(types.b.node).snap({
    //     //     object: { props: { a: { object: { props: { a: "string" } } } } }
    //     // })
    // })
    // test("cyclic thunks in scope", () => {
    //     const $ = scope({
    //         a: () => $.type({ b: "b" }),
    //         b: () => $.type({ a: "a" })
    //     })
    //     const types = $.compile()
    //     attest(types.a.infer).typed as {
    //         b: {
    //             a: any
    //         }
    //     }
    //     // attest(types.a.node).snap({ object: { props: { b: "b" } } })
    //     attest(types.b.infer).typed as {
    //         a: {
    //             b: any
    //         }
    //     }
    //     // attest(types.b.node).snap({ object: { props: { a: "a" } } })
    // })
    // test("expression from thunk", () => {
    //     const $ = scope({
    //         a: () => $.type({ a: "string" }),
    //         b: { b: "boolean" },
    //         aAndB: () => $.type("a&b")
    //     })
    //     const types = $.compile()
    //     attest(types.aAndB.infer).typed as {
    //         a: string
    //         b: boolean
    //     }
    //     // attest(types.aAndB.node).snap({
    //     //     object: { props: { a: "string", b: "boolean" } }
    //     // })
    // })
    // test("function requiring args in scope", () => {
    //     // @ts-expect-error it would be better if the error were in the def (instead we get a cyclic reference issue)
    //     const $ = scope({
    //         a: (t: true) => t && $.type("string")
    //     })
    //     attest(() => $.compile()).throws(
    //         writeBadDefinitionTypeMessage("Function")
    //     )
    // })
    // test("non-type thunk in scope", () => {
    //     const $ = scope({
    //         a: () => 42
    //     })
    //     attest(() => $.compile()).throws(
    //         writeBadDefinitionTypeMessage("Function")
    //     )
    // })
    // test("parse error in thunk in scope", () => {
    //     const $ = scope({
    //         // @ts-expect-error
    //         a: () => $.type("bad")
    //     })
    //     attest(() => $.compile()).throws(writeUnresolvableMessage("bad"))
    // })
})
