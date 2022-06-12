import { assert } from "@re-/assert"
import { narrow } from "#src"

it("literals", () => {
    assert(narrow("ok")).typed as "ok"
    assert(
        narrow({
            nested: { string: "narrowed", number: 1337 }
        })
    ).typed as { nested: { string: "narrowed"; number: 1337 } }
})
it("arrays", () => {
    assert(narrow([{ first: "narrowed" }, { second: 1337 }])).typed as [
        { first: "narrowed" },
        { second: 1337 }
    ]
    assert(narrow({ nested: ["yeah", { good: "okay" }] })).typed as {
        nested: ["yeah", { good: "okay" }]
    }
})
it("function", () => {
    // Function return values can't be narrowed
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    assert(narrow((args: -1) => 1)).typed as (args: -1) => number
    assert(narrow((...args: [["hi", 5], { a: "nother" }]) => args)).typed as (
        args_0: ["hi", 5],
        args_1: {
            a: "nother"
        }
    ) => [
        ["hi", 5],
        {
            a: "nother"
        }
    ]
})
it("any", () => {
    assert(narrow({} as any)).typed as any
})
/*
 * See note in narrow.ts.
 * it("unknown", () => {
 *     assert(narrow({} as unknown)).typed as unknown
 * })
 */
