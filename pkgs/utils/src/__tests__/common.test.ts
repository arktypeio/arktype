import { deepMap, EntryMapper, mapPaths, transform } from "../common"

const o = {
    a: 1,
    b: 2,
    c: 3
}

describe("transform", () => {
    test("transforms objects", () => {
        expect(transform(o, ([k, v]) => [k.toUpperCase(), -v])).toStrictEqual({
            A: -1,
            B: -2,
            C: -3
        })
    })
    test("errors on invalid objects", () => {
        expect(() => transform(null as any, (_) => _)).toThrow()
        expect(() => transform(undefined as any, (_) => _)).toThrow()
        expect(() => transform(true as any, (_) => _)).toThrow()
    })
})

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
