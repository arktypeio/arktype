import { AssertionError } from "node:assert"
import { assert } from "@arktype/check"
import { describe, test } from "mocha"
import { isKeyOf, keySet } from "../index.js"

const throwBadPresenceResultError = (
    key: string | number,
    expected: boolean
) => {
    throw new AssertionError({
        message: `'${key}' in keys should be ${expected}.`
    })
}

describe("keySet", () => {
    const keys = keySet({ a: 1, 1: 1 })
    test("narrows type", () => {
        assert(keys).narrowedValue({ a: 1, 1: 1 })
    })
    test("string", () => {
        const a = "a" as "a" | "b"
        const b = "b" as "a" | "b"
        if (isKeyOf(a, keys)) {
            assert(a).typed as "a"
        } else {
            throwBadPresenceResultError("a", true)
        }
        if (isKeyOf(b, keys)) {
            throwBadPresenceResultError("b", false)
        } else {
            assert(b).typed as "b"
        }
    })
    test("number", () => {
        const one = 1 as 1 | 2
        const two = 2 as 1 | 2
        if (isKeyOf(one, keys)) {
            assert(one).typed as 1
        } else {
            throwBadPresenceResultError(1, true)
        }
        if (isKeyOf(two, keys)) {
            throwBadPresenceResultError(2, false)
        } else {
            assert(two).typed as 2
        }
    })
})
