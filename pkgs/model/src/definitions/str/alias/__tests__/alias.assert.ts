import { assert } from "@re-/assert"
import { define, compile } from "@re-/model"
import { typeDefProxy } from "../internal.js"

describe("validate", () => {
    test("simple space", () => {
        const groceries = define(
            { fruits: "fruit[]" },
            {
                space: {
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
            }).errors
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
            }).errors
        ).toMatchInlineSnapshot(`
            "{fruits/0: '{length: 5000, description: 'I'm a big banana!', peel: 'slippery'} is not assignable to any of banana|apple:
            {banana: 'At path fruits/0, keys 'peel' were unexpected.', apple: 'At path fruits/0, required keys 'circumference, type' were missing. Keys 'length, description, peel' were unexpected.'}', fruits/1: '{type: 'Fuji'} is not assignable to any of banana|apple:
            {banana: 'At path fruits/1, required keys 'length' were missing. Keys 'type' were unexpected.', apple: 'At path fruits/1, required keys 'circumference' were missing.'}'}"
        `)
    })
    test("errors on shallow cycle", () => {
        // @ts-expect-error
        const shallowRecursive = define("a", { space: { a: "a" } })
        expect(() => shallowRecursive.assert("what's an a?")).toThrowError(
            "shallow"
        )
        const shallowCyclic = define("a", {
            // @ts-expect-error
            space: { a: "b", b: "c", c: "a|b|c" }
        })
        expect(() => shallowCyclic.assert(["what's a b?"])).toThrowError(
            "shallow"
        )
    })
    test("cyclic space", () => {
        const bicycle = define(
            { a: "a", b: "b", c: "either[]" },
            {
                space: {
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
            }).errors
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
            }).errors
        ).toMatchInlineSnapshot(`
            "{a/a/a/a/a/a/a/isA: 'false is not assignable to true.', b/b/b/b/b/b/b/isA: 'true is not assignable to false.', c/8: '{isA: 'the duck goes quack'} is not assignable to any of a|b:
            {a: 'At path c/8/isA, 'the duck goes quack' is not assignable to true.', b: 'At path c/8/isA, 'the duck goes quack' is not assignable to false.'}'}"
        `)
    })
    test("with space", () => {
        assert(
            define("borf", {
                space: { borf: true }
            }).type
        ).typed as true
        assert(
            define(
                { snorf: "borf[]" },
                { space: { borf: { f: false, u: undefined } } }
            ).type
        ).typed as { snorf: { f: false; u: undefined }[] }
    })
    const getCyclicSpace = () =>
        compile({
            a: { b: "b", isA: "true", isB: "false" },
            b: { a: "a", isA: "false", isB: "true" }
        })
    test("with onCycle option", () => {
        const { type } = getCyclicSpace().define(
            { a: "a", b: "b" },
            {
                onCycle: {
                    cyclic: "cyclic?"
                }
            }
        )
        assert(type.a.b.a.cyclic).type.toString.snap(
            `"{ b: { a: { b: { a: any; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; }; isA: true; isB: false; } | undefined"`
        )
        assert(type.b.a.b.cyclic).type.toString.snap(
            `"{ a: { b: { a: { b: any; isA: true; isB: false; }; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; } | undefined"`
        )
        // After initial cycle, no more "cyclic" transformations occur since
        // "deepOnCycle" was not passed
        assert(type.b.a.b.cyclic?.a.b.a.b.a.b.a.b.isB).typed as true | undefined
    })
    test("with deepOnCycleOption", () => {
        const { type } = getCyclicSpace().define(
            { a: "a", b: "b" },
            {
                deepOnCycle: true,
                onCycle: {
                    cyclic: "cyclic?"
                }
            }
        )
        assert(type.a.b.a.cyclic?.b.a.b.cyclic).type.toString.snap(
            `"{ a: { b: { a: { cyclic?: { b: { a: { b: { cyclic?: { a: { b: { a: any; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; } | undefined; }; isA: true; isB: false; }; isA: false; isB: true; }; isA: true; isB: false; } | undefined; }; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; } | undefined"`
        )
    })
    test("with onResolve option", () => {
        const { type } = getCyclicSpace().define(
            {
                referencesA: "a",
                noReferences: {
                    favoriteSoup: "'borscht'"
                }
            },
            {
                onResolve: {
                    wasResolved: "true",
                    resolvedType: "resolved"
                }
            }
        )
        assert(type.referencesA.wasResolved).typed as true
        assert(type.referencesA.resolvedType.b.wasResolved).typed as true
        // @ts-expect-error
        assert(type.noReferences.wasResolved).type.errors(
            "Property 'wasResolved' does not exist on type '{ favoriteSoup: \"borscht\"; }'."
        )
    })
    test("doesn't try to parse or validate any", () => {
        // Parse any as type
        assert(define({} as any).type).typed as any
        // Parse any as space
        const parseWithAnySpace = () =>
            define({ literal: "string", alias: "myType" }, { space: {} as any })
                .type
        assert(parseWithAnySpace).typed as () => {
            literal: string
            alias: any
        }
        assert(parseWithAnySpace)
            .throws()
            .snap(`"Unable to determine the type of 'myType' at path alias."`)
        // Parse any as space member
        assert(define(["number", "a"], { space: { a: {} as any } }).type)
            .typed as [number, any]
    })
    test("model props", () => {
        const a = define("a", {
            space: { a: "true" }
        })
        expect(a.definition).toBe("a")
        expect(a.space).toStrictEqual({ a: "true" })
        expect(a.validate(true).errors).toBeFalsy()
        expect(() => a.assert(false)).toThrow()
        expect(a.generate()).toBe(true)
        expect(a.type).toBe(typeDefProxy)
    })
})

const generate = (def: any, space: any = {}, opts: any = {}) =>
    define(def, { space }).generate(opts)

describe("generate", () => {
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
