import { transform, EntryMapper, mapPaths } from ".."

const o = {
    a: 1,
    b: 2,
    c: 3
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
