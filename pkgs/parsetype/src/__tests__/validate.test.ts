import { validate, typeOf } from ".."
import { expectType, expectError } from "tsd"

const typeOfResult = typeof ({} as any)
type JsTypeOf = typeof typeOfResult

describe("validate", () => {
    describe("typeOf", () => {
        test("string", () => {})
        test("number", () => {})
        test("bigint", () => {})
        test("boolean", () => {})
        test("symbol", () => {})
        test("undefined", () => {})
        test("object", () => {})
        test("function", () => {})
    })
})
