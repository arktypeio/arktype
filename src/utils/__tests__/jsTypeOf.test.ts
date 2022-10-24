import { describe, test } from "mocha"
import type { NormalizedJsTypeName } from "../index.js"
import { hasJsType, hasJsTypeIn, jsTypeOf } from "../index.js"
import { assert } from "#testing"

describe("jsTypeOf", () => {
    test("builtin", () => {
        assert(jsTypeOf(0n)).narrowedValue("bigint")
        assert(jsTypeOf(true)).narrowedValue("boolean")
        assert(jsTypeOf(() => {})).narrowedValue("function")
        assert(jsTypeOf(0)).narrowedValue("number")
        assert(jsTypeOf({})).narrowedValue("object")
        assert(jsTypeOf("")).narrowedValue("string")
        assert(jsTypeOf(Symbol())).narrowedValue("symbol")
        assert(jsTypeOf(undefined)).narrowedValue("undefined")
    })

    test("doesn't narrow based on unknown/any", () => {
        assert(jsTypeOf({} as any)).typed as NormalizedJsTypeName
        assert(jsTypeOf({} as unknown)).typed as NormalizedJsTypeName
    })

    test("object normalization", () => {
        assert(jsTypeOf({})).narrowedValue("object")
        assert(jsTypeOf(null)).narrowedValue("null")
        assert(jsTypeOf([])).narrowedValue("array")
    })

    test("type guard", () => {
        const data: unknown = []
        if (hasJsType(data, "array")) {
            assert(data).typed as unknown[]
        }
    })

    test("type guard keySet", () => {
        const data: unknown = ""
        if (hasJsTypeIn(data, { string: 1, number: 1 })) {
            assert(data).typed as string | number
        }
    })
})
