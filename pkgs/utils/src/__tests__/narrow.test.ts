import { Narrow } from ".."
import { expectType } from "tsd"

const narrow = <T>(arg: Narrow<T>) => arg as T

describe("Narrow", () => {
    test("literals", () => {
        const result = narrow({
            nested: { string: "narrowed", number: 1337 }
        })
        expectType<{ nested: { string: "narrowed"; number: 1337 } }>(result)
    })
    test("arrays", () => {
        const result = narrow(["narrowed", 1337])
        expectType<["narrowed", 1337]>(result)
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
