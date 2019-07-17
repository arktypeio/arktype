import { shapeFilter } from "../shapeFilter"
import { o } from "./common"

const filter = {
    a: {
        b: null,
        c: {
            a: 1
        }
    },
    c: ""
}
const expected = {
    a: {
        b: [0],
        c: {
            a: true
        }
    },
    c: null
}
test("doesn't modify objects", () => {
    const originalSource = JSON.parse(JSON.stringify(o))
    const originalFilter = JSON.parse(JSON.stringify(filter))
    shapeFilter(o, filter)
    expect(o).toStrictEqual(originalSource)
    expect(filter).toStrictEqual(originalFilter)
})

test("filters simple objects", () => {
    const result: typeof expected = shapeFilter(o, filter)
    expect(result).toStrictEqual(expected)
})

test("preserves source when filter is non-recursible", () => {
    const expected = { b: o.b }
    const result: typeof expected = shapeFilter(o, { b: null })
    expect(result).toStrictEqual(expected)
})

test("stops recursing if filter is deeper than source", () => {
    const result: typeof expected = shapeFilter(o, {
        ...filter,
        c: {
            d: {
                e: "I'm so deep!"
            }
        }
    })
    expect(result).toStrictEqual(expected)
})

test("ignores filter keys not in source", () => {
    const result: typeof expected = shapeFilter(o, {
        ...filter,
        ...{ extraneous: null }
    })
    expect(result).toStrictEqual(expected)
})

test("errors on non-object", () => {
    expect(() => shapeFilter(0, 0)).toThrow()
})
