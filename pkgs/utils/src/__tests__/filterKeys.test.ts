import { filterKeys } from ".."
import { o } from "./common"

test("doesn't modify objects", () => {
    const filter = ["a" as const]
    const originalSource = JSON.parse(JSON.stringify(o))
    const originalFilter = JSON.parse(JSON.stringify(filter))
    filterKeys(o, filter)
    expect(o).toStrictEqual(originalSource)
    expect(filter).toStrictEqual(originalFilter)
})

test("shallow filters objects", () => {
    const expected = { a: o.a, c: o.c }
    const result: typeof expected = filterKeys(o, ["a" as const, "c" as const])
    expect(result).toStrictEqual(expected)
})

test("deep filters objects", () => {
    const expected = {
        a: {
            a: "",
            b: [0]
        },
        b: {
            a: {
                a: 1
            }
        }
    }
    const result: typeof expected = filterKeys(
        o,
        ["a" as const, "b" as const],
        true
    )
    expect(result).toStrictEqual(expected)
})
