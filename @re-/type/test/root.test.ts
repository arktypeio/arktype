import { assert } from "@re-/assert"
import { describe, test } from "vitest"
import { type } from "../src/index.js"

describe("root definition", () => {
    describe("bad def types", () => {
        const expectedError = "Type definitions must be strings or objects."
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
    test("doesn't try to validate any as a model definition", () => {
        assert(type({} as any).infer).typed as any
    })
})
