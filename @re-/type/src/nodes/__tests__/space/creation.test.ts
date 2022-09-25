import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { space } from "../../../index.js"

describe("creation", () => {
    test("simple space", () => {
        assert(
            space({
                banana: {
                    length: "number",
                    description: "string?"
                },
                apple: {
                    circumference: "number",
                    type: "string"
                },
                fruit: "banana|apple"
            }).$root.type({
                fruits: "fruit[]",
                bestBanana: "banana",
                bestApple: "apple",
                bestFruit: "fruit",
                optionalFruit: "fruit?"
            }).default
        ).equals({
            fruits: [],
            bestBanana: { length: 0 },
            bestApple: { circumference: 0, type: "" },
            bestFruit: { length: 0 }
        })
    })
    test("optional cycle", () => {
        // If it's optional, the cycle should be ignored and just return undefined
        assert(
            space({
                a: { b: "b" },
                b: { c: "c?" },
                c: "a|b"
            })
                .$root.type("a")
                .generate()
        ).equals({ b: {} })
    })
    test("required cycle", () => {
        const cyclicSpace = space({
            a: { b: "b" },
            b: { c: "c" },
            c: "a|b"
        })
        assert(() => cyclicSpace.$root.type("a").generate()).throws.snap(
            `Error: Unable to generate a value for 'a|b': None of the definitions can be generated.`
        )
        assert(() => cyclicSpace.$root.type("a").generate({ verbose: true }))
            .throws
            .snap(`Error: Unable to generate a value for 'a|b': None of the definitions can be generated:
Unable to generate a value for 'a': Definition includes a required cycle:
a=>b=>c=>a
If you'd like to avoid throwing when this occurs, pass a value to return when this occurs to the 'onRequiredCycle' option.
Unable to generate a value for 'b': Definition includes a required cycle:
a=>b=>c=>b
If you'd like to avoid throwing when this occurs, pass a value to return when this occurs to the 'onRequiredCycle' option.`)
    })
    test("onRequiredCycle", () => {
        assert(
            space({
                a: { b: "b" },
                b: { c: "c" },
                c: "a|b"
            })
                .$root.type("a")
                .generate({ onRequiredCycle: { whoops: ["cycle"] } })
        ).unknown.equals({
            b: { c: { whoops: ["cycle"] } }
        })
    })
    test("onRequiredCycle with union", () => {
        assert(
            space({
                a: { b: "b" },
                b: { a: "a" }
            })
                .$root.type("a|b")
                .generate({ onRequiredCycle: "cycle" })
        ).unknown.equals({ b: { a: "cycle" } })
    })
    test("from parsed", () => {
        const defaultValue = space({
            group: { name: "string", description: "string?" }
        })
            .$root.type({
                requiredGroup: "group",
                requiredGroups: "group[]",
                optionalGroup: "group?",
                optionalGroups: "group[]?"
            })
            .generate()
        assert(defaultValue).equals({
            requiredGroup: { name: "" },
            requiredGroups: []
        })
    })
})
