import { assert } from "@re-/assert"
import { o } from "./common.js"
import { shapeFilter } from "#src"

const filter = {
    a: {
        b: null,
        c: {
            a: 1
        }
    },
    c: ""
}
const asserted = {
    a: {
        b: [0],
        c: {
            a: true
        }
    },
    c: null
}
it("doesn't modify objects", () => {
    const originalSource = JSON.parse(JSON.stringify(o))
    const originalFilter = JSON.parse(JSON.stringify(filter))
    shapeFilter(o, filter)
    assert(o).equals(originalSource)
    assert(filter).equals(originalFilter)
})

it("filters simple objects", () => {
    const result: typeof asserted = shapeFilter(o, filter)
    assert(result).equals(asserted)
})

it("preserves source when filter is non-recursible", () => {
    const asserted = { b: o.b }
    const result: typeof asserted = shapeFilter(o, { b: null })
    assert(result).equals(asserted)
})

it("stops recursing if filter is deeper than source", () => {
    const result: typeof asserted = shapeFilter(o, {
        ...filter,
        c: {
            d: {
                e: "I'm so deep!"
            }
        }
    })
    assert(result).equals(asserted)
})

it("ignores filter keys not in source", () => {
    const result: typeof asserted = shapeFilter(o, {
        ...filter,
        extraneous: null
    })
    assert(result).equals(asserted)
})

it("errors on non-object", () => {
    assert(() => shapeFilter(0, 0)).throws()
})
