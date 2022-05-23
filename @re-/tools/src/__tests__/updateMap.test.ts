import { assert } from "@re-/assert"
import { updateMap, DeepUpdate } from "../index.js"
import { o } from "./common.js"
import { test } from "mocha"

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
    assert(result).equals(expected)
})

test("updates objects to null", () => {
    const result = updateMap(o, { a: null } as any)
    assert(result).value.equals({ ...o, a: null })
})

test("updates keys missing that aren't defined in the original object", () => {
    const result = updateMap(o, { a: { c: { d: true } } })
    assert(result).equals({
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
    assert(result).equals(deepArrayExpected)
})
