import { compile, errorsAtPaths, parse, typeOf } from ".."
import { user } from "./multifile/user.js"

describe("typeOf", () => {
    test("string", () => expect(typeOf("")).toBe("string"))
    test("number", () => expect(typeOf(0)).toBe("number"))
    test("bigint", () => expect(typeOf(BigInt(0))).toBe("bigint"))
    test("boolean", () => {
        expect(typeOf(true)).toBe("true")
        expect(typeOf(false)).toBe("false")
    })
    test("symbol", () => expect(typeOf(Symbol())).toBe("symbol"))
    test("undefined", () => {
        const x: any = {}
        expect(typeOf(undefined)).toBe("undefined")
        expect(typeOf(x.nonexistent)).toBe("undefined")
    })
    test("null", () => expect(typeOf(null)).toBe("null"))
    test("object", () => {
        expect(
            typeOf({ a: { b: "nested", c: 5, d: { deep: null } } })
        ).toStrictEqual({
            a: { b: "string", c: "number", d: { deep: "null" } }
        })
    })
    test("function", () => {
        expect(
            typeOf(function saySomething() {
                console.log("I'm giving up on you")
            })
        ).toBe("function")
        expect(typeOf((someParam: any) => "someReturn")).toBe("function")
    })
    test("array", () => {
        expect(typeOf([7, "up"])).toStrictEqual(["number", "string"])
    })
    test("complex", () => {
        expect(typeOf([true, { a: ["ok", [() => {}]] }])).toStrictEqual([
            "true",
            { a: ["string", ["function"]] }
        ])
    })
})

describe("validate", () => {
    test("string", () => {
        const { checkErrors: validate } = parse("string")
        expect(validate("")).toBeFalsy()
        expect(validate(5)).toMatchInlineSnapshot(
            `"Extracted type 'number' is not assignable to defined type 'string'."`
        )
    })
    test("number", () => {
        const { checkErrors: validate } = parse("number")
        expect(validate(4.669)).toBeFalsy()
        expect(validate({ keyWithNumberValue: 5 })).toMatchInlineSnapshot(
            `"Extracted type '{keyWithNumberValue: number}' is not assignable to defined type 'number'."`
        )
    })
    test("bigint", () => {
        const { checkErrors: validate } = parse("bigint")
        expect(validate(BigInt(0))).toBeFalsy()
        expect(validate(0)).toMatchInlineSnapshot(
            `"Extracted type 'number' is not assignable to defined type 'bigint'."`
        )
    })
    test("boolean", () => {
        const { checkErrors: validate } = parse("boolean")
        expect(validate(true)).toBeFalsy()
        expect(validate(false)).toBeFalsy()
        expect(validate(1)).toMatchInlineSnapshot(
            `"Extracted type 'number' is not assignable to defined type 'boolean'."`
        )
    })
    test("symbol", () => {
        const { checkErrors: validate } = parse("symbol")
        expect(validate(Symbol())).toBeFalsy()
        expect(validate("symbol")).toMatchInlineSnapshot(
            `"Extracted type 'string' is not assignable to defined type 'symbol'."`
        )
    })
    test("undefined", () => {
        const { checkErrors: validate } = parse("undefined")
        expect(validate(undefined)).toBeFalsy()
        expect(validate("defined")).toMatchInlineSnapshot(
            `"Extracted type 'string' is not assignable to defined type 'undefined'."`
        )
        expect(validate(null)).toMatchInlineSnapshot(
            `"Extracted type 'null' is not assignable to defined type 'undefined'."`
        )
    })
    test("empty object", () => {
        expect(parse({}).checkErrors({})).toBeFalsy()
    })
    const simpleObject = parse({
        a: { b: "string", c: "number", d: { deep: "null" } }
    })
    test("simple object", () => {
        expect(
            simpleObject.checkErrors({
                a: { b: "nested", c: 5, d: { deep: null } }
            })
        ).toBeFalsy()
        const badValue = { a: { b: "nested", c: 5, d: { deep: {} } } }
        expect(simpleObject.checkErrors(badValue)).toMatchInlineSnapshot(
            `"At path 'a/d/deep', extracted type '{}' is not assignable to defined type 'null'."`
        )
    })
    test("can ignore extraneous keys", () => {
        expect(
            simpleObject.checkErrors(
                {
                    a: {
                        b: "nested",
                        c: 5,
                        d: { deep: null, extraneous: null }
                    }
                },
                { ignoreExtraneousKeys: true }
            )
        ).toBeFalsy()
        // But still errors on missing required keys
        expect(
            simpleObject.checkErrors({}, { ignoreExtraneousKeys: true })
        ).toMatchInlineSnapshot(`"Required keys a were missing."`)
    })
    test("multiple errors", () => {
        const reallyBadValue = {
            a: {
                b: null,
                c: Symbol(),
                d: {
                    deep: undefined,
                    shallow: "this wasn't supposed to be here"
                }
            }
        }
        expect(errorsAtPaths(reallyBadValue, simpleObject.definition))
            .toMatchInlineSnapshot(`
            Object {
              "a/b": "Extracted type 'null' is not assignable to defined type 'string'.",
              "a/c": "Extracted type 'symbol' is not assignable to defined type 'number'.",
              "a/d": "Keys shallow were unexpected.",
            }
        `)
        // Let's make sure once that multiple errors are
        expect(simpleObject.checkErrors(reallyBadValue)).toMatchInlineSnapshot(
            `"{a/b: Extracted type 'null' is not assignable to defined type 'string'., a/c: Extracted type 'symbol' is not assignable to defined type 'number'., a/d: Keys shallow were unexpected.}"`
        )
    })
    test("generic function", () => {
        const { checkErrors: validate } = parse("function")
        expect(
            validate(function saySomething() {
                console.log("I'm giving up on you")
            })
        ).toBeFalsy()
        expect(validate({})).toMatchInlineSnapshot(
            `"Extracted type '{}' is not assignable to defined type 'function'."`
        )
    })
    test("defined function treated as generic for validation", () => {
        const { checkErrors: validate } = parse("(number,object)=>string")
        expect(validate(() => {})).toBeFalsy()
        expect(validate("I promise I'm a function")).toMatchInlineSnapshot(
            `"Extracted type 'string' is not assignable to defined type '(number,object)=>string'."`
        )
    })
    test("array", () => {
        const { checkErrors: validate } = parse(["number", "string"])
        expect(validate([7, "up"])).toBeFalsy()
        expect(validate([7, 7])).toMatchInlineSnapshot(
            `"At path '1', extracted type 'number' is not assignable to defined type 'string'."`
        )
        expect(validate([7, "up", 7])).toMatchInlineSnapshot(
            `"Tuple of length 3 is not assignable to defined tuple of length 2."`
        )
        expect(errorsAtPaths(["up", 7], ["number", "string"]))
            .toMatchInlineSnapshot(`
            Object {
              "0": "Extracted type 'string' is not assignable to defined type 'number'.",
              "1": "Extracted type 'number' is not assignable to defined type 'string'.",
            }
        `)
    })
    test("or type", () => {
        const { checkErrors: validate } = parse("string|number")
        expect(validate("heyo")).toBeFalsy()
        expect(validate(0)).toBeFalsy()
        expect(validate(["listen what I say-o"])).toMatchInlineSnapshot(`
            "'[string]' is not assignable to any of 'string|number':
            {string: Extracted type '[string]' is not assignable to defined type 'string'., number: Extracted type '[string]' is not assignable to defined type 'number'.}"
        `)
    })
    test("complex", () => {
        const { checkErrors: validate } = parse([
            "true",
            { a: ["string", ["() => void"]] }
        ])
        expect(validate([true, { a: ["ok", [() => {}]] }])).toBeFalsy()
        expect(
            validate([true, { a: ["ok", [() => {}], "extraElement"] }])
        ).toMatchInlineSnapshot(
            `"At path '1/a', tuple of length 3 is not assignable to defined tuple of length 2."`
        )
        expect(validate([false, { a: [0, [0, 1, 2]] }])).toMatchInlineSnapshot(
            `"{0: Extracted type 'false' is not assignable to defined type 'true'., 1/a/0: Extracted type 'number' is not assignable to defined type 'string'., 1/a/1: Tuple of length 3 is not assignable to defined tuple of length 1.}"`
        )
    })
    test("simple typeset", () => {
        const groceries = parse(
            { fruits: "fruit[]" },
            {
                banana: { length: "number", description: "string?" },
                apple: { circumference: "number", type: "string" },
                fruit: "banana|apple"
            }
        )
        expect(
            groceries.checkErrors({
                fruits: [
                    { length: 10 },
                    { circumference: 4.832321, type: "Granny Smith" },
                    { length: 15, description: "nice" }
                ]
            })
        ).toBeFalsy()
        expect(
            groceries.checkErrors({
                fruits: [
                    {
                        length: 5000,
                        description: "I'm a big banana!",
                        peel: "slippery"
                    },

                    { type: "Fuji" }
                ]
            })
        ).toMatchInlineSnapshot(`
            "{fruits/0: '{length: number, description: string, peel: string}' is not assignable to any of 'banana|apple':
            {banana: At path 'fruits/0', keys peel were unexpected., apple: At path 'fruits/0', required keys circumference, type were missing. Keys length, description, peel were unexpected.}, fruits/1: '{type: string}' is not assignable to any of 'banana|apple':
            {banana: At path 'fruits/1', required keys length were missing. Keys type were unexpected., apple: At path 'fruits/1', required keys circumference were missing.}}"
        `)
    })
    test("errors on shallow cycle", () => {
        const shallowRecursive = parse("a", { a: "a" })
        expect(() => shallowRecursive.assert("what's an a?")).toThrowError(
            "shallowly"
        )
        const shallowCyclic = parse("a", { a: "b", b: "c", c: "a|b|c" })
        expect(() => shallowCyclic.checkErrors(["what's a b?"])).toThrowError(
            "shallowly"
        )
    })
    test("cyclic typeset", () => {
        const bicycle = parse(
            { a: "a", b: "b", c: "either[]" },
            {
                a: { a: "a?", b: "b?", isA: "true" },
                b: { a: "a?", b: "b?", isA: "false" },
                either: "a|b"
            }
        )
        expect(
            bicycle.checkErrors({
                a: {
                    isA: true,
                    a: { isA: true },
                    b: { isA: false, a: { isA: true } }
                },
                b: { isA: false },
                c: [
                    { isA: false, a: { isA: true } },
                    { isA: true, b: { isA: false } }
                ]
            })
        ).toBeFalsy()
        expect(
            bicycle.checkErrors({
                a: {
                    isA: true,
                    a: {
                        isA: true,
                        a: {
                            isA: true,
                            a: {
                                isA: true,
                                a: {
                                    isA: true,
                                    a: { isA: true, a: { isA: false } }
                                }
                            }
                        }
                    }
                },

                b: {
                    isA: false,
                    b: {
                        isA: false,
                        b: {
                            isA: false,
                            b: {
                                isA: false,
                                b: {
                                    isA: false,
                                    b: { isA: false, b: { isA: true } }
                                }
                            }
                        }
                    }
                },

                c: [
                    { isA: true },
                    { isA: false },
                    { isA: true },
                    { isA: false },
                    { isA: true },
                    { isA: false },
                    { isA: true },
                    { isA: false },
                    { isA: "the duck goes quack" }
                ]
            })
        ).toMatchInlineSnapshot(`
            "{a/a/a/a/a/a/a/isA: Extracted type 'false' is not assignable to defined type 'true'., b/b/b/b/b/b/b/isA: Extracted type 'true' is not assignable to defined type 'false'., c/8: '{isA: string}' is not assignable to any of 'a|b':
            {a: At path 'c/8/isA', extracted type 'string' is not assignable to defined type 'true'., b: At path 'c/8/isA', extracted type 'string' is not assignable to defined type 'false'.}}"
        `)
    })
})
