import { assert } from "@re-/assert"
import { define } from ".."
import { definitionTypeErrorTemplate } from "../errors.js"

const generate = (def: any, space: any = {}, opts: any = {}) =>
    define(def, { space }).generate(opts)

describe("generate", () => {
    test("deep", () => {
        expect(
            generate({
                a: { b: "string", c: "number", d: { deep: "null" } },
                b: ["object", "undefined|null", "null|number"]
            })
        ).toStrictEqual({
            a: { b: "", c: 0, d: { deep: null } },
            b: [{}, undefined, null]
        })
    })
    test("complex", () => {
        expect(
            generate(["true", { a: ["string?", ["true|null|object[]"]] }])
        ).toStrictEqual([true, { a: [undefined, [null]] }])
    })
    test("simple space", () => {
        expect(
            generate(
                {
                    fruits: "fruit[]",
                    bestBanana: "banana",
                    bestApple: "apple",
                    bestFruit: "fruit",
                    optionalFruit: "fruit?"
                },
                {
                    banana: { length: "number", description: "string?" },
                    apple: { circumference: "number", type: "string" },
                    fruit: "banana|apple"
                }
            )
        ).toStrictEqual({
            fruits: [],
            bestBanana: { length: 0 },
            bestApple: { circumference: 0, type: "" },
            bestFruit: { length: 0 }
        })
    })
    test("cyclic space", () => {
        // If it's optional, the cycle should be ignored and just return undefined
        expect(
            generate("a", {
                a: { b: "b" },
                b: { c: "c?" },
                c: "a|b"
            })
        ).toStrictEqual({ b: {} })
        expect(() =>
            generate("a", {
                a: { b: "b" },
                b: { c: "c" },
                c: "a|b"
            })
        ).toThrowErrorMatchingInlineSnapshot(`
            "Unable to generate a default value for type including a required cycle:
            a=>b=>c=>a
            If you'd like to avoid throwing in when this occurs, pass a value to return when this occurs to the 'onRequiredCycle' option."
        `)
        expect(
            generate(
                "a",
                {
                    a: { b: "b" },
                    b: { c: "c" },
                    c: "a|b"
                },
                { onRequiredCycle: { whoops: ["cycle"] } }
            )
        ).toStrictEqual({
            b: { c: { whoops: ["cycle"] } }
        })
        expect(
            generate(
                "a|b",
                {
                    a: { b: "b" },
                    b: { a: "a" }
                },
                { onRequiredCycle: "cycle" }
            )
        ).toStrictEqual({ b: { a: "cycle" } })
    })
    test("unparseable", () => {
        expect(() => generate("")).toThrowErrorMatchingInlineSnapshot(
            `"Unable to determine the type of ''."`
        )
        expect(() =>
            generate({ a: { b: { c: "true|false|blorf" } } })
        ).toThrowErrorMatchingInlineSnapshot(
            `"Unable to determine the type of 'blorf' at path a/b/c."`
        )
        assert(() => generate({ hmm: { seems: { bad: () => {} } } })).throws(
            definitionTypeErrorTemplate
        )
    })
    test("from parsed", () => {
        const defaultValue = define(
            {
                requiredGroup: "group",
                requiredGroups: "group[]",
                optionalGroup: "group?",
                optionalGroups: "group[]?"
            },
            { space: { group: { name: "string", description: "string?" } } }
        ).generate()
        expect(defaultValue).toStrictEqual({
            requiredGroup: { name: "" },
            requiredGroups: []
        })
    })
})
