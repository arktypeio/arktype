import { shapeFilter } from "@re-/tools"
import { assert } from "@re-/assert"
import { o } from "./common.ts"
const { test } = Deno

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
test("doesn't modify objects", () => {
    const originalSource = JSON.parse(JSON.stringify(o))
    const originalFilter = JSON.parse(JSON.stringify(filter))
    shapeFilter(o, filter)
    assert(o).equals(originalSource)
    assert(filter).equals(originalFilter)
})

test("filters simple objects", () => {
    const result: typeof asserted = shapeFilter(o, filter)
    assert(result).equals(asserted)
})

test("preserves source when filter is non-recursible", () => {
    const asserted = { b: o.b }
    const result: typeof asserted = shapeFilter(o, { b: null })
    assert(result).equals(asserted)
})

test("stops recursing if filter is deeper than source", () => {
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

test("ignores filter keys not in source", () => {
    const result: typeof asserted = shapeFilter(o, {
        ...filter,
        ...{ extraneous: null }
    })
    assert(result).equals(asserted)
})

test("errors on non-object", () => {
    assert(() => shapeFilter(0, 0)).throws()
})
