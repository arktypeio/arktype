import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { mapValues, mutateValues } from "../index.js"

describe("mapValues", () => {
    test("dict", () => {
        const stringified = mapValues(
            {
                a: 0,
                b: false
            },
            (v) => String(v)
        )
        assert(stringified).equals({ a: "0", b: "false" }).typed as {
            a: string
            b: string
        }
    })
    test("array", () => {
        const stringified = mapValues([0, false], (v) => String(v))
        assert(stringified).equals(["0", "false"]).typed as string[]
    })
    test("tuple", () => {
        const stringified = mapValues([0, false] as const, (v) => String(v))
        assert(stringified).equals(["0", "false"]).typed as readonly [
            string,
            string
        ]
    })
    test("doesn't mutate", () => {
        const original = { a: 1, b: 2 }
        const incremented = mapValues(original, (v) => v + 1)
        assert(incremented).equals({ a: 2, b: 3 })
        assert(original).equals({ a: 1, b: 2 })
    })
})

describe("mutateValues", () => {
    test("dict", () => {
        const original = {
            a: 0 as unknown,
            b: false as unknown
        }
        const stringified = mutateValues(original, (v) => String(v))
        assert(stringified).equals({ a: "0", b: "false" }).typed as {
            a: string
            b: string
        }
        assert(original).equals(stringified)
    })
    test("array", () => {
        const original = [0 as unknown, false as unknown]
        const stringified = mutateValues(original, (v) => String(v))
        assert(stringified).equals(["0", "false"]).typed as string[]
        assert(original).equals(stringified)
    })
})
