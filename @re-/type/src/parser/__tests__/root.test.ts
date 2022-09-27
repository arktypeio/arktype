import { assert } from "@re-/assert"
import type { Dictionary } from "@re-/tools"
import { describe, test } from "mocha"
import { Root, space, type } from "../../api.js"
import { unresolvableMessage } from "../str/operand/unenclosed.js"

describe("root definition", () => {
    // TODO: Add lazy tests
    describe("dynamic", () => {
        test("uninferred types", () => {
            const dynamicStringArray = type.dynamic("str" + "ing[" + "]")
            assert(dynamicStringArray.infer).typed as unknown
            assert(dynamicStringArray.ast).equals(["string", "[]"])
        })
        test("uninferred spaces", () => {
            const s = space.dynamic({
                a: "str" + "ing[" + "]",
                b: "a?"
            })
            assert(s.$root.aliases).typed as Dictionary<unknown>
            // Types are inferred as unknown
            assert(s.a.infer).typed as unknown
            // Allows all references, but will throw if they're not defined at runtime
            assert(() => {
                s.$root.type({ a: "st" })
            }).throws(unresolvableMessage("st"))
            // Runtime nodes created correctly
            assert(s.$root.ast).equals({ a: ["string", "[]"], b: ["a", "?"] })
        })
    })
    describe("bad def types", () => {
        test("undefined", () => {
            // @ts-expect-error
            assert(() => type({ bad: undefined })).throwsAndHasTypeError(
                Root.badDefinitionTypeMessage
            )
        })
        test("null", () => {
            // @ts-expect-error
            assert(() => type({ bad: null })).throwsAndHasTypeError(
                Root.badDefinitionTypeMessage
            )
        })
        test("boolean", () => {
            // @ts-expect-error
            assert(() => type({ bad: true })).throwsAndHasTypeError(
                Root.badDefinitionTypeMessage
            )
        })
        test("number", () => {
            // @ts-expect-error
            assert(() => type({ bad: 5 })).throwsAndHasTypeError(expectedError)
        })
        test("bigint", () => {
            // @ts-expect-error
            assert(() => type({ bad: 99999n })).throwsAndHasTypeError(
                Root.badDefinitionTypeMessage
            )
        })
        test("function", () => {
            // @ts-expect-error
            assert(() => type({ bad: () => {} })).throwsAndHasTypeError(
                Root.badDefinitionTypeMessage
            )
        })
        test("symbol", () => {
            // @ts-expect-error
            assert(() => type({ bad: Symbol() })).throwsAndHasTypeError(
                Root.badDefinitionTypeMessage
            )
        })
    })
    // TODO: Re-enable
    // test("doesn't try to validate any as a model definition", () => {
    //     assert(type({} as any).infer).typed as any
    // })
})
