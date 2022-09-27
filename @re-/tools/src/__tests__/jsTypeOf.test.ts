import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import type { NormalizedJsTypeName } from "../index.js"
import { hasJsType, jsTypeOf } from "../index.js"

type Z = {
    bigint: bigint
    boolean: boolean
    function: Function
    number: number
    object: object | null
    string: string
    symbol: symbol
    undefined: undefined
}

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
})
