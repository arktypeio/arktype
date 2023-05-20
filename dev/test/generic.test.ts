import { scope } from "../../src/scope.js"
import { attest } from "../attest/main.js"

const lazily = <t extends object>(thunk: () => t): t => {
    let cached: any
    return new Proxy<t>({} as t, {
        get: (_, prop) => {
            if (!cached) {
                cached = thunk()
            }
            return cached[prop as keyof t]
        },
        set: (_, prop, value) => {
            if (!cached) {
                cached = thunk()
            }
            cached[prop] = value
            return true
        }
    })
}

suite("generic", () => {
    const $ = lazily(() =>
        scope({
            "box<t>": {
                box: "t"
            },
            "pair<t,u>": ["t", "u"],
            foo: "box<string>",
            bar: "boolean"
        })
    )
    const types = lazily(() => $.compile())

    test("unary", () => {
        $.type("box<string>")
    })

    test("cyclic", () => {
        // attest(types.bitBox).types.toString()
    })
    test("errors on missing args", () => {})
})

// const types = scope({
//     "box<t,u>": {
//         box: "t|u"
//     },
//     nestedBox: "box<0|1, box<'one'|'zero', nestedBox>>",
//     rightBounds: "box<number>5, string>=7>",
//     // Error: box<t, u> requires exactly 2 parameters (got 1: 2|3)
//     nestedMissingArg: "box<0|1, box<2|3>>",
//     // Error: box<t, u> requires exactly 2 parameters (got 3: 2, 3, 4)
//     nestedExtraArg: "box<0|1, box<2, 3, 4>>",
//     // Error: % operator must be followed by a non-zero integer literal (was 0)
//     nestedSemanticError: "box<0,box<1,number%0>>"
// }).compile()

// types.nestedBox

const $ = scope({
    a: "string",
    b: "a[]"
})
