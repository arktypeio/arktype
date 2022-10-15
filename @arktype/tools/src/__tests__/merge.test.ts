import { assert } from "@arktype/assert"
import { describe, test } from "mocha"
import { deepMerge, merge, narrow } from "../index.js"

describe("merge", () => {
    test("simple values", () => {
        const expected = narrow({ a: "fromA", b: "fromB", c: "fromC" })
        const actual = merge(
            narrow({ a: "fromA", b: "fromA" }),
            narrow({ b: "fromB", c: "fromB" }),
            narrow({ c: "fromC" })
        )
        assert(actual).typedValue(expected)
    })
    test("optional keys", () => {
        const result = merge(
            { a: "fromA", b: "fromA" } as { a?: "fromA"; b?: "fromA" },
            narrow({
                b: "fromB",
                c: "fromB"
            })
        )
        assert(result).equals({
            a: "fromA",
            b: "fromB",
            c: "fromB"
        }).typed as {
            a?: "fromA"
            b: "fromB"
            c: "fromB"
        }
    })
    test("merge exclude values", () => {
        const expected = narrow({ a: "defined" })
        const actual = merge(narrow({ a: "defined" }), { a: undefined })
        // undefined excluded by default (type currently does not exclude undefined merging)
        assert(actual).equals(expected as any)
    })
})

describe("deepMerge", () => {
    test("optional keys", () => {
        const result = deepMerge(
            {
                nested: { a: "fromA", b: "fromA" } as {
                    a?: "fromA"
                    b?: "fromA"
                }
            },
            narrow({ nested: { b: "fromB", c: "fromB" } })
        )
        assert(result).equals({
            nested: {
                a: "fromA",
                b: "fromB",
                c: "fromB"
            }
        }).typed as {
            nested: {
                a: "fromA" | undefined
                b: "fromB"
                c: "fromB"
            }
        }
    })
    test("treats arrays like non-objects", () => {
        const base = narrow({ a: [1, 2, 3, 4, 5], b: 6, c: [7], d: [8] })
        const merged = narrow({
            a: ["a", "b", "c"],
            b: ["d"],
            c: []
        })
        const result = deepMerge(base, merged)
        assert(result).equals({ ...merged, d: [8] })
    })
})
