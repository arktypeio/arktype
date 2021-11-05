import { getDefault } from "../defaults.js"
import { parse } from ".."

describe("default values", () => {
    test("built-in", () => {
        expect(getDefault("string")).toBe("")
        expect(getDefault("boolean")).toBe(false)
        expect(getDefault("any")).toBe(undefined)
        expect(typeof getDefault("function")).toBe("function")
        expect(() => getDefault("never")).toThrow()
    })
    test("number literal", () => {
        expect(getDefault("5")).toBe(5)
        expect(getDefault("7.91")).toBe(7.91)
        expect(getDefault(5)).toBe(5)
        expect(getDefault(7.91)).toBe(7.91)
    })
    test("or", () => {
        expect(getDefault("undefined|string")).toBe(undefined)
        expect(getDefault("number|false|()=>undefined")).toBe(false)
    })
    test("or literals", () => {
        const typeSet = {
            five: 5,
            duck: "'duck'",
            func: "(five, duck)=>duck"
        }
        expect(getDefault("func|five|duck", typeSet)).toBe(5)
        expect(getDefault("duck|func", typeSet)).toBe("duck")
    })
    test("arrow function", () => {
        expect(typeof getDefault("(boolean,any)=>void")).toBe("function")
    })
    test("list", () => {
        expect(getDefault("function[]")).toStrictEqual([])
    })
    test("deep", () => {
        expect(
            getDefault({
                a: { b: "string", c: "number", d: { deep: "null" } },
                b: ["object", "undefined|null", "null|number"]
            })
        ).toStrictEqual({
            a: { b: "", c: 0, d: { deep: null } },
            b: [{}, undefined, null]
        })
    })
    test("optional", () => {
        expect(
            getDefault({ optional: "boolean?", required: "boolean" })
        ).toStrictEqual({ required: false })
    })
    test("complex", () => {
        expect(
            getDefault(["true", { a: ["string?", ["true|null|object[]"]] }])
        ).toStrictEqual([true, { a: [undefined, [null]] }])
    })
    test("simple typeset", () => {
        expect(
            getDefault(
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
    test("cyclic typeSet", () => {
        // If it's optional, the cycle should be ignored and just return undefined
        expect(
            getDefault("a", {
                a: "b",
                b: { a: "a?" },
                c: "a|b"
            })
        ).toStrictEqual({})
        expect(() =>
            getDefault("a", {
                a: { b: "b" },
                b: { c: "c" },
                c: "a|b"
            })
        ).toThrowErrorMatchingInlineSnapshot(`
            "Unable to generate a default value for type including a required cycle:
            a=>b=>c=>a.If you'd like to avoid throwing in when this occurs, pass a value to return when this occurs to the 'onRequiredCycle' option."
        `)
        expect(
            getDefault(
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
            getDefault(
                "a|b",
                {
                    a: "b",
                    b: "a"
                },
                { onRequiredCycle: "cycle" }
            )
        ).toBe("cycle")
        expect(
            getDefault(
                "a|b|safe",
                {
                    a: "b",
                    b: "a",
                    safe: "false"
                },
                { onRequiredCycle: {} }
            )
        ).toBe(false)
    })
    test("unparseable", () => {
        expect(() => getDefault("")).toThrowErrorMatchingInlineSnapshot(
            `"Could not find a default value satisfying ."`
        )
        expect(() =>
            getDefault({ a: { b: { c: "true|false|blorf" } } })
        ).toThrowErrorMatchingInlineSnapshot(
            `"Could not find a default value satisfying blorf at 'a/b/c'."`
        )
        expect(() =>
            getDefault({ hmm: { seems: { bad: true } } })
        ).toThrowErrorMatchingInlineSnapshot(
            `"Definition value true at path hmm/seems/bad is invalid. Definitions must be strings, numbers, or objects."`
        )
    })
    test("from parsed", () => {
        const defaultValue = parse(
            {
                requiredGroup: "group",
                requiredGroups: "group[]",
                optionalGroup: "group?",
                optionalGroups: "group[]?"
            },
            { typeSet: { group: { name: "string", description: "string?" } } }
        ).getDefault()
        expect(defaultValue).toStrictEqual({
            requiredGroup: { name: "" },
            requiredGroups: []
        })
    })
})
