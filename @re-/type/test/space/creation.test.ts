import { assert } from "@re-/assert"
import { space } from "../../src/index.js"

describe("creation", () => {
    it("simple space", () => {
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
            }).$meta.type({
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
    it("optional cycle", () => {
        // If it's optional, the cycle should be ignored and just return undefined
        assert(
            space({
                a: { b: "b" },
                b: { c: "c?" },
                c: "a|b"
            })
                .$meta.type("a")
                .create()
        ).equals({ b: {} })
    })
    it("required cycle", () => {
        const cyclicSpace = space({
            a: { b: "b" },
            b: { c: "c" },
            c: "a|b"
        })
        assert(() => cyclicSpace.$meta.type("a").create()).throws.snap(
            `Error: Unable to generate a value for 'a|b': None of the definitions can be generated.`
        )
        assert(() => cyclicSpace.$meta.type("a").create({ verbose: true }))
            .throws
            .snap(`Error: Unable to generate a value for 'a|b': None of the definitions can be generated:
Unable to generate a value for 'a': Definition includes a required cycle:
a=>b=>c=>a
If you'd like to avoid throwing when this occurs, pass a value to return when this occurs to the 'onRequiredCycle' option.
Unable to generate a value for 'b': Definition includes a required cycle:
a=>b=>c=>b
If you'd like to avoid throwing when this occurs, pass a value to return when this occurs to the 'onRequiredCycle' option.`)
    })
    it("onRequiredCycle", () => {
        assert(
            space({
                a: { b: "b" },
                b: { c: "c" },
                c: "a|b"
            })
                .$meta.type("a")
                .create({ onRequiredCycle: { whoops: ["cycle"] } })
        ).value.equals({
            b: { c: { whoops: ["cycle"] } }
        })
    })
    it("onRequiredCycle with union", () => {
        assert(
            space({
                a: { b: "b" },
                b: { a: "a" }
            })
                .$meta.type("a|b")
                .create({ onRequiredCycle: "cycle" })
        ).value.equals({ b: { a: "cycle" } })
    })
    it("from parsed", () => {
        const defaultValue = space({
            group: { name: "string", description: "string?" }
        })
            .$meta.type({
                requiredGroup: "group",
                requiredGroups: "group[]",
                optionalGroup: "group?",
                optionalGroups: "group[]?"
            })
            .create()
        assert(defaultValue).equals({
            requiredGroup: { name: "" },
            requiredGroups: []
        })
    })
})
