import { assert } from "@re-/assert"
import { deepMerge, merge, narrow } from "#src"

describe("merge", () => {
    it("simple values", () => {
        const expected = narrow({ a: "fromA", b: "fromB", c: "fromC" })
        const actual = merge(
            narrow({ a: "fromA", b: "fromA" }),
            narrow({ b: "fromB", c: "fromB" }),
            narrow({ c: "fromC" })
        )
        assert(actual).typedValue(expected)
    })
    it("optional keys", () => {
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
    it("merge exclude values", () => {
        const expected = narrow({ a: "defined" })
        const actual = merge(narrow({ a: "defined" }), { a: undefined })
        // undefined excluded by default (type currently does not exclude undefined merging)
        assert(actual).equals(expected as any)
    })
})

describe("deepMerge", () => {
    it("optional keys", () => {
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
})
