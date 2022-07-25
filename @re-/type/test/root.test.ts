import { assert } from "@re-/assert"
import { type } from "../src/index.js"

describe("root definition", () => {
    describe("bad def types", () => {
        const expectedError = "Type definitions must be strings or objects."
        it("undefined", () => {
            // @ts-expect-error
            assert(() => type({ bad: undefined })).throwsAndHasTypeError(
                expectedError
            )
        })
        it("null", () => {
            // @ts-expect-error
            assert(() => type({ bad: null })).throwsAndHasTypeError(
                expectedError
            )
        })
        it("boolean", () => {
            // @ts-expect-error
            assert(() => type({ bad: true })).throwsAndHasTypeError(
                expectedError
            )
        })
        it("number", () => {
            // @ts-expect-error
            assert(() => type({ bad: 5 })).throwsAndHasTypeError(expectedError)
        })
        it("bigint", () => {
            // @ts-expect-error
            assert(() => type({ bad: 99999n })).throwsAndHasTypeError(
                expectedError
            )
        })
        it("function", () => {
            // @ts-expect-error
            assert(() => type({ bad: () => {} })).throwsAndHasTypeError(
                expectedError
            )
        })
        it("symbol", () => {
            // @ts-expect-error
            assert(() => type({ bad: Symbol() })).throwsAndHasTypeError(
                expectedError
            )
        })
    })
    it("doesn't try to validate any as a model definition", () => {
        assert(type({} as any).infer).typed as any
    })
})
