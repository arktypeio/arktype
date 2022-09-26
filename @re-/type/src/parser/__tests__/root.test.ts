import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { dynamic, dynamicSpace, type } from "../../index.js"
import { unresolvableMessage } from "../str/operand/unenclosed.js"

describe("root definition", () => {
    describe("dynamic", () => {
        test("allows uninferred types", () => {
            const dynamicStringArray = dynamic("str" + "ing[" + "]")
            assert(dynamicStringArray.infer).typed as unknown
            assert(dynamicStringArray.ast).equals(["string", "[]"])
        })
        test("allows uninferred spaces", () => {
            const s = dynamicSpace({
                a: "str" + "ing[" + "]",
                b: "a?"
            })
            // Root dict is inferred as any so that all aliases are allowed
            assert(s.$root.aliases).typed as any
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
        const expectedError = "Type definitions must be strings or objects"
        test("undefined", () => {
            // @ts-expect-error
            assert(() => type({ bad: undefined })).throwsAndHasTypeError(
                expectedError
            )
        })
        test("null", () => {
            // @ts-expect-error
            assert(() => type({ bad: null })).throwsAndHasTypeError(
                expectedError
            )
        })
        test("boolean", () => {
            // @ts-expect-error
            assert(() => type({ bad: true })).throwsAndHasTypeError(
                expectedError
            )
        })
        test("number", () => {
            // @ts-expect-error
            assert(() => type({ bad: 5 })).throwsAndHasTypeError(expectedError)
        })
        test("bigint", () => {
            // @ts-expect-error
            assert(() => type({ bad: 99999n })).throwsAndHasTypeError(
                expectedError
            )
        })
        test("function", () => {
            // @ts-expect-error
            assert(() => type({ bad: () => {} })).throwsAndHasTypeError(
                expectedError
            )
        })
        test("symbol", () => {
            // @ts-expect-error
            assert(() => type({ bad: Symbol() })).throwsAndHasTypeError(
                expectedError
            )
        })
    })
    // TODO: Re-enable
    // test("doesn't try to validate any as a model definition", () => {
    //     assert(type({} as any).infer).typed as any
    // })
})
