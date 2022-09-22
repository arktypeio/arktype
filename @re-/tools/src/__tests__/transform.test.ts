import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { mapValues, mutateValues, transform } from "../index.js"

describe("transform", () => {
    test("to dict", () => {
        const stringified = transform([0, 1], ([k, v]) => [
            "$" + String(k),
            !!v
        ])
        assert(stringified).equals({ $0: false, $1: true }).typed as Record<
            string,
            boolean
        >
    })
    test("to array", () => {
        const stringified = transform({ a: 0, b: 1 }, ([k, v]) => [v, k])
        assert(stringified).equals(["a", "b"]).typed as ("a" | "b")[]
    })
})

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
