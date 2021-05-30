import { updateMap, DeepUpdate } from ".."
import { o } from "./common"

const map: DeepUpdate<typeof o> = {
    a: {
        a: "new",
        b: (_) => _.concat([1, 2, 3]),
        c: {
            a: false,
            b: (_) => !_,
            c: null
        }
    },
    b: {
        a: {
            a: (_) => _ + 1
        }
    },
    d: (_) => _ + "suffix"
}

const expected = {
    a: {
        a: "new",
        b: [0, 1, 2, 3],
        c: {
            a: false,
            b: true,
            c: null
        }
    },
    b: {
        a: {
            a: 2
        }
    },
    c: null,
    d: "initialsuffix",
    e: [{ a: ["old"] }, { a: ["old"] }]
}

test("updates simple objects", () => {
    const result: typeof expected = updateMap(o, map)
    expect(result).toStrictEqual(expected)
})

test("updates objects to null", () => {
    const result = updateMap(o, { a: null } as any)
    expect(result).toStrictEqual({ ...o, a: null })
})

test("updates keys missing that aren't defined in the original object", () => {
    const result = updateMap(o, { a: { c: { d: true } } })
    expect(result).toStrictEqual({
        ...o,
        a: { ...o.a, c: { ...o.a.c, d: true } }
    })
})

test("updates deep arrays", () => {
    const deepArrayExpected = {
        ...o,
        e: [{ a: ["old"] }, { a: ["old"] }, { a: ["new"] }]
    }
    const result: typeof deepArrayExpected = updateMap(o, {
        e: (_) => _.concat({ a: ["new"] })
    })
    expect(result).toStrictEqual(deepArrayExpected)
})
