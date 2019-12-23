import { updateMap, DeepUpdate } from ".."
import { o } from "./common"

const map: DeepUpdate<typeof o> = {
    a: {
        a: "new",
        b: value => value.concat([1, 2, 3]),
        c: {
            a: false,
            b: value => !value,
            c: null
        }
    },
    b: {
        a: {
            a: value => value + 1
        }
    },
    d: value => value + "suffix"
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

test("updates deep arrays", () => {
    const deepArrayExpected = {
        ...o,
        e: [{ a: ["old"] }, { a: ["old"] }, { a: ["new"] }]
    }
    const result: typeof deepArrayExpected = updateMap(o, {
        e: value => value.concat({ a: ["new"] })
    })
    expect(result).toStrictEqual(deepArrayExpected)
})
