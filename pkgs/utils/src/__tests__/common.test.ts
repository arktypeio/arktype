import { expectType } from "tsd"
import { deepMap, EntryMapper, mapPaths, mergeAll } from ".."

const o = {
    a: 1,
    b: 2,
    c: 3
}

const deepO = {
    a: o,
    b: o
}

const pathsOfDeepO = {
    a: {
        a: ["a", "a"],
        b: ["a", "b"],
        c: ["a", "c"]
    },
    b: {
        a: ["b", "a"],
        b: ["b", "b"],
        c: ["b", "c"]
    }
}

const mapLeavesToPaths: EntryMapper = ([k, v], { path }) => [
    k,
    path.length === 2 ? path : v
]

test("mergeAll", () => {
    const result = mergeAll(
        { a: "fromA", b: "fromA" },
        { b: "fromB", c: "fromB" },
        { c: "fromC" }
    )
    expectType<{ a: "fromA"; b: "fromB"; c: "fromC" }>(result)
    expect(result).toStrictEqual({ a: "fromA", b: "fromB", c: "fromC" })
})

test("deepMap", () => {
    const result = deepMap(deepO, mapLeavesToPaths)
    expect(result).toStrictEqual(pathsOfDeepO)
})

test("deepMap recurse condition", () => {
    const result = deepMap(deepO, mapLeavesToPaths, {
        recurseWhen: ([k, v], { path }) => k === "b" && path.includes("b")
    })
    expect(result).toStrictEqual({ a: o, b: pathsOfDeepO.b })
})

test("deepMap filter condition", () => {
    const result = deepMap(deepO, (_) => _, {
        filterWhen: ([k, v]) => k === "a"
    })
    expect(result).toStrictEqual({ b: { b: 2, c: 3 } })
})

test("path map", () => {
    expect(
        mapPaths([["a", "b", "c"], ["b", "c"], ["c"], ["a", "c"]])
    ).toStrictEqual({
        a: {
            b: {
                c: {}
            },
            c: {}
        },
        b: {
            c: {}
        },
        c: {}
    })
})
