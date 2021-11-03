import { expectType } from "tsd"
import { Evaluate, merge, mergeAll } from ".."

test("mergeAll shallow", () => {
    const result = mergeAll([
        { a: "fromA", b: "fromA" },
        { b: "fromB", c: "fromB" },
        { c: "fromC" }
    ])
    expectType<{ a: "fromA"; b: "fromB"; c: "fromC" }>(result)
    expect(result).toStrictEqual({ a: "fromA", b: "fromB", c: "fromC" })
})

test("merge shallow", () => {
    const result = merge(
        { a: "fromA", b: "fromA" } as { a?: "fromA"; b?: "fromA" },
        { b: "fromB", c: "fromB" }
    )
    expectType<{
        a?: "fromA"
        b: "fromB"
        c: "fromB"
    }>(result)
    expect(result).toStrictEqual({
        a: "fromA",
        b: "fromB",
        c: "fromB"
    })
})

test("merge string and numeric keys", () => {
    const mergeNumeric = merge({ "1": false }, { 1: true })
    expectType<{ 1: true }>(mergeNumeric)
    expect(mergeNumeric).toStrictEqual({ 1: true })
    const mergeString = merge({ 1: false }, { "1": true })
    expectType<{ 1: true }>(mergeString)
    expect(mergeString).toStrictEqual({ 1: true })
})

test("merge exclude values", () => {
    // undefined excluded by default
    const result = merge({ a: "defined" }, { a: undefined })
    expectType<{ a: "defined" }>(result)
    expect(result).toStrictEqual({ a: "defined" })
    const second = merge({ a: "string" }, { a: true }, { unmerged: [true] })
    expectType<{ a: "string" }>(second)
    expect(second).toStrictEqual({ a: "string" })
})

test("deep merge", () => {
    const result = merge(
        { nested: { a: "fromA", b: "fromA" } as { a?: "fromA"; b?: "fromA" } },
        { nested: { b: "fromB", c: "fromB" } },
        { deep: true }
    )
    expectType<{
        nested: {
            a?: "fromA"
            b: "fromB"
            c: "fromB"
        }
    }>(result)
    expect(result).toStrictEqual({
        nested: {
            a: "fromA",
            b: "fromB",
            c: "fromB"
        }
    })
})
