import { suite, test } from "mocha"
import { scope } from "../../src/main.js"
import { lazily } from "./utils.js"

suite("generic", () => {
    const $ = lazily(() =>
        scope({
            "box<t>": {
                box: "t"
            },
            "pair<t,u>": ["t", "u"],
            foo: "box<bar>",
            bar: "boolean"
        })
    )
    const types = lazily(() => $.export())

    test("unary", () => {
        const t = $.type("box<string>")
    })

    test("cyclic", () => {
        // attest(types.bitBox).types.toString()
    })
    // TODO: add tests for generics referencing types that are no longer in scope
    test("errors on missing args", () => {})
})

// const types = scope({
//     "box<t,u>": {
//         box: "t|u"
//     },
//     nestedBox: "box<0|1, box<'one'|'zero', nestedBox>>",
//     rightBounds: "box<number>5, string>=7>"
//     // // Error: box<t, u> requires exactly 2 parameters (got 1: 2|3)
//     // nestedMissingArg: "box<0|1, box<2|3>>",
//     // // Error: box<t, u> requires exactly 2 parameters (got 3: 2, 3, 4)
//     // nestedExtraArg: "box<0|1, box<2, 3, 4>>",
//     // // Error: % operator must be followed by a non-zero integer literal (was 0)
//     // nestedSemanticError: "box<0,box<1,number%0>>"
// }).compile()
