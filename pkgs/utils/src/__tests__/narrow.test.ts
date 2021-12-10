import { Narrow, narrow } from ".."
import { expectType } from "tsd"

describe("Narrow", () => {
    test("literals", () => {
        const single = narrow("ok")
        expectType<"ok">(single)
        const result = narrow({
            nested: { string: "narrowed", number: 1337 }
        })
        expectType<{ nested: { string: "narrowed"; number: 1337 } }>(result)
    })
    test("arrays", () => {
        const result = narrow([{ first: "narrowed" }, { second: 1337 }])
        expectType<[{ first: "narrowed" }, { second: 1337 }]>(result)
        const nestedArray = narrow({ nested: ["yeah", { good: "okay" }] })
        expectType<{ nested: ["yeah", { good: "okay" }] }>(nestedArray)
    })
    test("function", () => {
        // Function return values can't be narrowed
        expectType<(args: -1) => number>(narrow((args: -1) => 1))
        const result = narrow((...args: [["hi", 5], { a: "nother" }]) => {})
        type Expected = (
            a: ["hi", 5],
            b: {
                a: "nother"
            }
        ) => void
        expectType<Expected>(result)
    })
})
