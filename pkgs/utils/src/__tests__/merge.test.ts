import { assert } from "@re-do/assert"
import { Evaluate, merge, mergeAll, narrow } from ".."

test("mergeAll shallow", () => {
    const expected = narrow({ a: "fromA", b: "fromB", c: "fromC" })
    assert(
        mergeAll([
            { a: "fromA", b: "fromA" },
            { b: "fromB", c: "fromB" },
            { c: "fromC" }
        ])
    ).typedValue(expected)
})

test("merge shallow", () => {
    assert(
        merge({ a: "fromA", b: "fromA" } as { a?: "fromA"; b?: "fromA" }, {
            b: "fromB",
            c: "fromB"
        })
    ).equals({
        a: "fromA",
        b: "fromB",
        c: "fromB"
    }).typed as {
        a?: "fromA"
        b: "fromB"
        c: "fromB"
    }
})

test("merge string and numeric keys", () => {
    const expected = { 1: true as true }
    assert(merge({ "1": false }, { 1: true })).typedValue(expected)
    assert(merge({ 1: false }, { "1": true })).typedValue(expected)
})

test("merge exclude values", () => {
    const expected = narrow({ a: "defined" })
    // undefined excluded by default
    assert(merge({ a: "defined" }, { a: undefined })).typedValue(expected)
    assert(
        merge({ a: "defined" }, { a: true }, { unmerged: [true] })
    ).typedValue(expected)
})

test("deep merge", () => {
    assert(
        merge(
            {
                nested: { a: "fromA", b: "fromA" } as {
                    a?: "fromA"
                    b?: "fromA"
                }
            },
            { nested: { b: "fromB", c: "fromB" } },
            { deep: true }
        )
    ).equals({
        nested: {
            a: "fromA",
            b: "fromB",
            c: "fromB"
        }
    }).typed as {
        nested: {
            a?: "fromA"
            b: "fromB"
            c: "fromB"
        }
    }
})
