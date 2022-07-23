import { assert } from "@re-/assert"
import { eager, type } from "../src/index.js"

describe("root definition", () => {
    describe("bad def types", () => {
        const expectedError = "Type definitions must be strings or objects."
        it("undefined", () => {
            // @ts-expect-error
            assert(() => eager({ bad: undefined })).throwsAndHasTypeError(
                expectedError
            )
        })
        it("null", () => {
            // @ts-expect-error
            assert(() => eager({ bad: null })).throwsAndHasTypeError(
                expectedError
            )
        })
        it("boolean", () => {
            // @ts-expect-error
            assert(() => eager({ bad: true })).throwsAndHasTypeError(
                expectedError
            )
        })
        it("number", () => {
            // @ts-expect-error
            assert(() => eager({ bad: 5 })).throwsAndHasTypeError(expectedError)
        })
        it("bigint", () => {
            // @ts-expect-error
            assert(() => eager({ bad: 99999n })).throwsAndHasTypeError(
                expectedError
            )
        })
        it("function", () => {
            // @ts-expect-error
            assert(() => eager({ bad: () => {} })).throwsAndHasTypeError(
                expectedError
            )
        })
        it("symbol", () => {
            // @ts-expect-error
            assert(() => eager({ bad: Symbol() })).throwsAndHasTypeError(
                expectedError
            )
        })
    })
    it("doesn't try to validate any as a model definition", () => {
        assert(type({} as any).infer).typed as any
    })
})
