import { transform, EntryMapper, mapPaths } from ".."

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
