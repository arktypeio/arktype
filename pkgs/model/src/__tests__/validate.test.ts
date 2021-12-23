import { Func } from "@re-/tools"
import { define, typeOf } from ".."

describe("typeOf", () => {
    test("string", () => {
        expect(typeOf("redo")).toBe("'redo'")
        expect(typeOf("")).toBe("''")
    })
    test("number", () => {
        expect(typeOf(0)).toBe(0)
        expect(typeOf(3.14159)).toBe(3.14159)
    })
    test("boolean", () => {
        expect(typeOf(true)).toBe("true")
        expect(typeOf(false)).toBe("false")
    })
    test("bigint", () => expect(typeOf(BigInt(0))).toBe(0n))
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
            a: { b: "'nested'", c: 5, d: { deep: "null" } }
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
        expect(typeOf([7, "up"])).toStrictEqual([7, "'up'"])
    })
    test("complex", () => {
        expect(typeOf([true, { a: ["ok", [() => {}]] }])).toStrictEqual([
            "true",
            { a: ["'ok'", ["function"]] }
        ])
    })
})

describe("validate", () => {
    test("string", () => {
        const { validate } = define("string")
        expect(validate("")).toBeFalsy()
        expect(validate(5)).toMatchInlineSnapshot(
            `"5 is not assignable to string."`
        )
    })
    test("string literal", () => {
        const { validate } = define("'dursurdo'")
        expect(validate("dursurdo")).toBeFalsy()
        expect(validate("durrrrrr")).toMatchInlineSnapshot(
            `"'durrrrrr' is not assignable to 'dursurdo'."`
        )
    })
    test("number", () => {
        const { validate } = define("number")
        expect(validate(4.669)).toBeFalsy()
        expect(validate({ keyWithNumberValue: 5 })).toMatchInlineSnapshot(
            `"{keyWithNumberValue: 5} is not assignable to number."`
        )
    })
    const valid8 = (validate: Function) => {
        expect(validate(8)).toBeFalsy()
        expect(validate(8.0)).toBeFalsy()
        expect(validate(8.000001)).toMatchInlineSnapshot(
            `"8.000001 is not assignable to 8."`
        )
        expect(validate("8")).toMatchInlineSnapshot(
            `"'8' is not assignable to 8."`
        )
    }
    const validateGolden = (validate: Func) => {
        expect(validate(1.618)).toBeFalsy()
        expect(validate(2)).toMatchInlineSnapshot(
            `"2 is not assignable to 1.618."`
        )
        expect(validate("1.618")).toMatchInlineSnapshot(
            `"'1.618' is not assignable to 1.618."`
        )
    }
    test("number literal in string", () => {
        valid8(define("8").validate)
        validateGolden(define("1.618").validate)
    })
    test("number literal", () => {
        valid8(define(8).validate)
        validateGolden(define(1.618).validate)
    })
    test("bigint", () => {
        const { validate } = define("bigint")
        expect(validate(BigInt(0))).toBeFalsy()
        expect(validate(0)).toMatchInlineSnapshot(
            `"0 is not assignable to bigint."`
        )
    })
    test("boolean", () => {
        const { validate } = define("boolean")
        expect(validate(true)).toBeFalsy()
        expect(validate(false)).toBeFalsy()
        expect(validate(1)).toMatchInlineSnapshot(
            `"1 is not assignable to boolean."`
        )
    })
    test("symbol", () => {
        const { validate } = define("symbol")
        expect(validate(Symbol())).toBeFalsy()
        expect(validate("symbol")).toMatchInlineSnapshot(
            `"'symbol' is not assignable to symbol."`
        )
    })
    test("undefined", () => {
        const { validate } = define("undefined")
        expect(validate(undefined)).toBeFalsy()
        expect(validate("defined")).toMatchInlineSnapshot(
            `"'defined' is not assignable to undefined."`
        )
        expect(validate(null)).toMatchInlineSnapshot(
            `"null is not assignable to undefined."`
        )
    })
    test("empty object", () => {
        expect(define({}).validate({})).toBeFalsy()
    })
    const simpleObject = define({
        a: { b: "string", c: "number", d: { deep: "null" } }
    })
    test("simple object", () => {
        expect(
            simpleObject.validate({
                a: { b: "nested", c: 5, d: { deep: null } }
            })
        ).toBeFalsy()
        const badValue = { a: { b: "nested", c: 5, d: { deep: {} } } }
        expect(simpleObject.validate(badValue)).toMatchInlineSnapshot(
            `"At path a/d/deep, {} is not assignable to null."`
        )
    })
    test("can ignore extraneous keys", () => {
        expect(
            simpleObject.validate(
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
            simpleObject.validate({}, { ignoreExtraneousKeys: true })
        ).toMatchInlineSnapshot(`"Required keys 'a' were missing."`)
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
        expect(
            define(simpleObject.definition).validate(reallyBadValue)
        ).toMatchInlineSnapshot(
            `"{a/b: 'null is not assignable to string.', a/c: 'symbol is not assignable to number.', a/d: 'Keys 'shallow' were unexpected.'}"`
        )
        expect(simpleObject.validate(reallyBadValue)).toMatchInlineSnapshot(
            `"{a/b: 'null is not assignable to string.', a/c: 'symbol is not assignable to number.', a/d: 'Keys 'shallow' were unexpected.'}"`
        )
    })
    test("function", () => {
        const { validate } = define("function")
        expect(
            validate(function saySomething() {
                console.log("I'm giving up on you")
            })
        ).toBeFalsy()
        expect(validate({})).toMatchInlineSnapshot(
            `"{} is not assignable to function."`
        )
    })
    test("defined function widened for validation", () => {
        const { validate } = define("(number,object)=>string")
        expect(validate(() => {})).toBeFalsy()
        expect(validate("I promise I'm a function")).toMatchInlineSnapshot(
            `"'I promise I'm a function' is not assignable to (number,object)=>string."`
        )
    })
    test("array", () => {
        const { validate } = define(["number", "string"])
        expect(validate([7, "up"])).toBeFalsy()
        expect(validate([7, 7])).toMatchInlineSnapshot(
            `"At index 1, 7 is not assignable to string."`
        )
        expect(validate([7, "up", 7])).toMatchInlineSnapshot(
            `"Tuple of length 3 is not assignable to tuple of length 2."`
        )
        expect(
            define(["number", "string"]).validate(["up", 7])
        ).toMatchInlineSnapshot(
            `"{0: ''up' is not assignable to number.', 1: '7 is not assignable to string.'}"`
        )
    })
    test("or type", () => {
        const { validate } = define("string|number")
        expect(validate("heyo")).toBeFalsy()
        expect(validate(0)).toBeFalsy()
        expect(validate(["listen what I say-o"])).toMatchInlineSnapshot(`
            "['listen what I say-o'] is not assignable to any of string|number:
            {string: '['listen what I say-o'] is not assignable to string.', number: '['listen what I say-o'] is not assignable to number.'}"
        `)
    })
    test("complex", () => {
        const { validate } = define([
            "true",
            { a: ["string", ["(string) => void"]] }
        ])
        expect(validate([true, { a: ["ok", [() => {}]] }])).toBeFalsy()
        expect(
            validate([true, { a: ["ok", [() => {}], "extraElement"] }])
        ).toMatchInlineSnapshot(
            `"At path 1/a, tuple of length 3 is not assignable to tuple of length 2."`
        )
        expect(validate([false, { a: [0, [0, 1, 2]] }])).toMatchInlineSnapshot(
            `"{0: 'false is not assignable to true.', 1/a/0: '0 is not assignable to string.', 1/a/1: 'Tuple of length 3 is not assignable to tuple of length 1.'}"`
        )
    })
    test("simple typespace", () => {
        const groceries = define(
            { fruits: "fruit[]" },
            {
                typespace: {
                    banana: { length: "number", description: "string?" },
                    apple: { circumference: "number", type: "string" },
                    fruit: "banana|apple"
                },
                path: [],
                shallowSeen: [],
                seen: {}
            }
        )
        expect(
            groceries.validate({
                fruits: [
                    { length: 10 },
                    { circumference: 4.832321, type: "Granny Smith" },
                    { length: 15, description: "nice" }
                ]
            })
        ).toBeFalsy()
        expect(
            groceries.validate({
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
            "{fruits/0: '{length: 5000, description: 'I'm a big banana!', peel: 'slippery'} is not assignable to any of banana|apple:
            {banana: 'At path fruits/0, keys 'peel' were unexpected.', apple: 'At path fruits/0, required keys 'circumference, type' were missing. Keys 'length, description, peel' were unexpected.'}', fruits/1: '{type: 'Fuji'} is not assignable to any of banana|apple:
            {banana: 'At path fruits/1, required keys 'length' were missing. Keys 'type' were unexpected.', apple: 'At path fruits/1, required keys 'circumference' were missing.'}'}"
        `)
    })
    test("errors on shallow cycle", () => {
        // @ts-expect-error
        const shallowRecursive = define("a", { typespace: { a: "a" } })
        expect(() => shallowRecursive.validate("what's an a?")).toThrowError(
            "shallow"
        )
        const shallowCyclic = define("a", {
            // @ts-expect-error
            typespace: { a: "b", b: "c", c: "a|b|c" }
        })
        expect(() => shallowCyclic.validate(["what's a b?"])).toThrowError(
            "shallow"
        )
    })
    test("cyclic typespace", () => {
        const bicycle = define(
            { a: "a", b: "b", c: "either[]" },
            {
                typespace: {
                    a: { a: "a?", b: "b?", isA: "true" },
                    b: { a: "a?", b: "b?", isA: "false" },
                    either: "a|b"
                }
            }
        )
        expect(
            bicycle.validate({
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
            bicycle.validate({
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
            "{a/a/a/a/a/a/a/isA: 'false is not assignable to true.', b/b/b/b/b/b/b/isA: 'true is not assignable to false.', c/8: '{isA: 'the duck goes quack'} is not assignable to any of a|b:
            {a: 'At path c/8/isA, 'the duck goes quack' is not assignable to true.', b: 'At path c/8/isA, 'the duck goes quack' is not assignable to false.'}'}"
        `)
    })
})
