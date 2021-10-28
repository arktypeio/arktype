import { errorsAtPaths, parse, typeOf } from ".."
import { SimpleFunction } from "../utils.js"

describe("typeOf", () => {
    test("string", () => {
        expect(typeOf("redo")).toBe("'redo'")
        expect(typeOf("")).toBe("''")
        // With spaces
    })
    test("number", () => {
        expect(typeOf(0)).toBe(0)
        expect(typeOf(3.14159)).toBe(3.14159)
    })
    test("boolean", () => {
        expect(typeOf(true)).toBe("true")
        expect(typeOf(false)).toBe("false")
    })
    test("bigint", () => expect(typeOf(BigInt(0))).toBe("bigint"))
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
        const { checkErrors } = parse("string")
        expect(checkErrors("")).toBeFalsy()
        expect(checkErrors(5)).toMatchInlineSnapshot(
            `"5 is not assignable to string."`
        )
    })
    test("string literal", () => {
        const { checkErrors } = parse("'dursurdo'")
        expect(checkErrors("dursurdo")).toBeFalsy()
        expect(checkErrors("durrrrrr")).toMatchInlineSnapshot(
            `"'durrrrrr' is not assignable to 'dursurdo'."`
        )
    })
    test("number", () => {
        const { checkErrors } = parse("number")
        expect(checkErrors(4.669)).toBeFalsy()
        expect(checkErrors({ keyWithNumberValue: 5 })).toMatchInlineSnapshot(
            `"{keyWithNumberValue: 5} is not assignable to number."`
        )
    })
    const valid8 = (checkErrors: SimpleFunction) => {
        expect(checkErrors(8)).toBeFalsy()
        expect(checkErrors(8.0)).toBeFalsy()
        expect(checkErrors(8.000001)).toMatchInlineSnapshot(
            `"8.000001 is not assignable to 8."`
        )
        expect(checkErrors("8")).toMatchInlineSnapshot(
            `"'8' is not assignable to 8."`
        )
    }
    const validateGolden = (checkErrors: SimpleFunction) => {
        expect(checkErrors(1.618)).toBeFalsy()
        expect(checkErrors(2)).toMatchInlineSnapshot(
            `"2 is not assignable to 1.618."`
        )
        expect(checkErrors("1.618")).toMatchInlineSnapshot(
            `"'1.618' is not assignable to 1.618."`
        )
    }
    test("number literal in string", () => {
        valid8(parse("8").checkErrors)
        validateGolden(parse("1.618").checkErrors)
    })
    test("number literal", () => {
        valid8(parse(8).checkErrors)
        validateGolden(parse(1.618).checkErrors)
    })
    test("bigint", () => {
        const { checkErrors } = parse("bigint")
        expect(checkErrors(BigInt(0))).toBeFalsy()
        expect(checkErrors(0)).toMatchInlineSnapshot(
            `"0 is not assignable to bigint."`
        )
    })
    test("boolean", () => {
        const { checkErrors } = parse("boolean")
        expect(checkErrors(true)).toBeFalsy()
        expect(checkErrors(false)).toBeFalsy()
        expect(checkErrors(1)).toMatchInlineSnapshot(
            `"1 is not assignable to boolean."`
        )
    })
    test("symbol", () => {
        const { checkErrors } = parse("symbol")
        expect(checkErrors(Symbol())).toBeFalsy()
        expect(checkErrors("symbol")).toMatchInlineSnapshot(
            `"'symbol' is not assignable to symbol."`
        )
    })
    test("undefined", () => {
        const { checkErrors } = parse("undefined")
        expect(checkErrors(undefined)).toBeFalsy()
        expect(checkErrors("defined")).toMatchInlineSnapshot(
            `"'defined' is not assignable to undefined."`
        )
        expect(checkErrors(null)).toMatchInlineSnapshot(
            `"null is not assignable to undefined."`
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
            `"At path a/d/deep, {} is not assignable to null."`
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
        expect(errorsAtPaths(reallyBadValue, simpleObject.definition))
            .toMatchInlineSnapshot(`
            Object {
              "a/b": "null is not assignable to string.",
              "a/c": "symbol is not assignable to number.",
              "a/d": "Keys 'shallow' were unexpected.",
            }
        `)
        expect(simpleObject.checkErrors(reallyBadValue)).toMatchInlineSnapshot(
            `"{a/b: 'null is not assignable to string.', a/c: 'symbol is not assignable to number.', a/d: 'Keys 'shallow' were unexpected.'}"`
        )
    })
    test("function", () => {
        const { checkErrors } = parse("function")
        expect(
            checkErrors(function saySomething() {
                console.log("I'm giving up on you")
            })
        ).toBeFalsy()
        expect(checkErrors({})).toMatchInlineSnapshot(
            `"{} is not assignable to function."`
        )
    })
    test("defined function widened for validation", () => {
        const { checkErrors } = parse("(number,object)=>string")
        expect(checkErrors(() => {})).toBeFalsy()
        expect(checkErrors("I promise I'm a function")).toMatchInlineSnapshot(
            `"'I promise I'm a function' is not assignable to (number,object)=>string."`
        )
    })
    test("array", () => {
        const { checkErrors } = parse(["number", "string"])
        expect(checkErrors([7, "up"])).toBeFalsy()
        expect(checkErrors([7, 7])).toMatchInlineSnapshot(
            `"At index 1, 7 is not assignable to string."`
        )
        expect(checkErrors([7, "up", 7])).toMatchInlineSnapshot(
            `"Tuple of length 3 is not assignable to tuple of length 2."`
        )
        expect(errorsAtPaths(["up", 7], ["number", "string"]))
            .toMatchInlineSnapshot(`
            Object {
              "0": "'up' is not assignable to number.",
              "1": "7 is not assignable to string.",
            }
        `)
    })
    test("or type", () => {
        const { checkErrors } = parse("string|number")
        expect(checkErrors("heyo")).toBeFalsy()
        expect(checkErrors(0)).toBeFalsy()
        expect(checkErrors(["listen what I say-o"])).toMatchInlineSnapshot(`
            "['listen what I say-o'] is not assignable to any of string|number:
            {string: '['listen what I say-o'] is not assignable to string.', number: '['listen what I say-o'] is not assignable to number.'}"
        `)
    })
    test("complex", () => {
        const { checkErrors } = parse([
            "true",
            { a: ["string", ["() => void"]] }
        ])
        expect(checkErrors([true, { a: ["ok", [() => {}]] }])).toBeFalsy()
        expect(
            checkErrors([true, { a: ["ok", [() => {}], "extraElement"] }])
        ).toMatchInlineSnapshot(
            `"At path 1/a, tuple of length 3 is not assignable to tuple of length 2."`
        )
        expect(
            checkErrors([false, { a: [0, [0, 1, 2]] }])
        ).toMatchInlineSnapshot(
            `"{0: 'false is not assignable to true.', 1/a/0: '0 is not assignable to string.', 1/a/1: 'Tuple of length 3 is not assignable to tuple of length 1.'}"`
        )
    })
    test("simple typeset", () => {
        const groceries = parse(
            { fruits: "fruit[]" },
            {
                typeSet: {
                    banana: { length: "number", description: "string?" },
                    apple: { circumference: "number", type: "string" },
                    fruit: "banana|apple"
                }
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
            "{fruits/0: '{length: 5000, description: 'I'm a big banana!', peel: 'slippery'} is not assignable to any of banana|apple:
            {banana: 'At path fruits/0, keys 'peel' were unexpected.', apple: 'At path fruits/0, required keys 'circumference, type' were missing. Keys 'length, description, peel' were unexpected.'}', fruits/1: '{type: 'Fuji'} is not assignable to any of banana|apple:
            {banana: 'At path fruits/1, required keys 'length' were missing. Keys 'type' were unexpected.', apple: 'At path fruits/1, required keys 'circumference' were missing.'}'}"
        `)
    })
    test("errors on shallow cycle", () => {
        const shallowRecursive = parse("a", { typeSet: { a: "a" } })
        expect(() => shallowRecursive.assert("what's an a?")).toThrowError(
            "shallowly"
        )
        const shallowCyclic = parse("a", {
            typeSet: { a: "b", b: "c", c: "a|b|c" }
        })
        expect(() => shallowCyclic.checkErrors(["what's a b?"])).toThrowError(
            "shallowly"
        )
    })
    test("cyclic typeset", () => {
        const bicycle = parse(
            { a: "a", b: "b", c: "either[]" },
            {
                typeSet: {
                    a: { a: "a?", b: "b?", isA: "true" },
                    b: { a: "a?", b: "b?", isA: "false" },
                    either: "a|b"
                }
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
            "{a/a/a/a/a/a/a/isA: 'false is not assignable to true.', b/b/b/b/b/b/b/isA: 'true is not assignable to false.', c/8: '{isA: 'the duck goes quack'} is not assignable to any of a|b:
            {a: 'At path c/8/isA, 'the duck goes quack' is not assignable to true.', b: 'At path c/8/isA, 'the duck goes quack' is not assignable to false.'}'}"
        `)
    })
})
