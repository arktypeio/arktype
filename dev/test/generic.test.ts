import { suite, test } from "mocha"
import { scope, type } from "../../src/main.js"
import type { Ark } from "../../src/scopes/ark.js"
import type { Generic } from "../../src/type.js"
import { attest } from "../attest/main.js"
import { lazily } from "./utils.js"

suite("standalone generic", () => {
    test("unary", () => {
        const boxOf = type("<t>", { box: "t" })
        attest(boxOf).typed as Generic<
            ["t"],
            {
                box: "t"
            },
            Ark
        >
        const schrodingersBox = boxOf({ cat: { isAlive: "boolean" } })
        attest(schrodingersBox.infer).typed as {
            box: { cat: { isAlive: boolean } }
        }
    })
    test("binary", () => {
        const either = type("<first, second>", "first|second")
        attest(either).typed as Generic<
            ["first", "second"],
            "first|second",
            Ark
        >
        const schrodingersBox = either(
            { cat: { isAlive: "true" } },
            { cat: { isAlive: "false" } }
        )
        attest(schrodingersBox.infer).typed as
            | {
                  cat: {
                      isAlive: true
                  }
              }
            | {
                  cat: {
                      isAlive: false
                  }
              }
        // ideally this would be reduced to { cat: { isAlive: boolean } }:
        // https://github.com/arktypeio/arktype/issues/751
    })
})

suite("in-scope generic", () => {
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
        attest(t.infer)
    })

    test("binary", () => {
        const t = $.type("pair<string, number>")
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
