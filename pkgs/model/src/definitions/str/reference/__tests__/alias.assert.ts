import { assert } from "@re-/assert"
import { create, compile } from "@re-/model"
import { narrow } from "@re-/tools"

export const testAlias = () => {
    describe("type", () => {
        test("with space", () => {
            assert(
                create(
                    "borf",
                    narrow({
                        space: { dictionary: { borf: true } }
                    })
                ).type
            ).typed as true
            assert(
                create(
                    { snorf: "borf[]" },
                    narrow({
                        space: {
                            dictionary: {
                                borf: { f: false, u: undefined }
                            }
                        }
                    })
                ).type
            ).typed as { snorf: { f: false; u: undefined }[] }
        })
        test("with onCycle option", () => {
            const cyclic = compile({
                a: { b: "b", isA: "true", isB: "false" },
                b: { a: "a", isA: "false", isB: "true" },
                onCycle: {
                    cyclic: "cyclic?"
                }
            }).create({
                a: "a",
                b: "b"
            })
            assert(cyclic.type.a.b.a.cyclic).type.toString.snap(
                `"{ b: { a: { b: { a: any; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; }; isA: true; isB: false; } | undefined"`
            )
            assert(cyclic.type.b.a.b.cyclic).type.toString.snap(
                `"{ a: { b: { a: { b: any; isA: true; isB: false; }; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; } | undefined"`
            )
            assert(cyclic.type.a.b.a.cyclic?.b.a.b.cyclic).type.toString.snap(
                `"{ a: { b: { a: { cyclic?: { b: { a: { b: { cyclic?: { a: { b: { a: any; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; } | undefined; }; isA: true; isB: false; }; isA: false; isB: true; }; isA: true; isB: false; } | undefined; }; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; } | undefined"`
            )
        })
        test("with onResolve option", () => {
            const withOnResolve = compile({
                a: { b: "b", isA: "true", isB: "false" },
                b: { a: "a", isA: "false", isB: "true" },
                onResolve: {
                    wasResolved: "true",
                    resolvedType: "resolution"
                }
            }).create({
                referencesA: "a",
                noReferences: {
                    favoriteSoup: "'borscht'"
                }
            })
            assert(withOnResolve.type.referencesA.wasResolved).typed as true
            assert(withOnResolve.type.referencesA.resolvedType.b.wasResolved)
                .typed as true
            // @ts-expect-error
            assert(withOnResolve.type.noReferences.wasResolved).type.errors(
                "Property 'wasResolved' does not exist on type '{ favoriteSoup: \"borscht\"; }'."
            )
        })
    })
    describe("validation", () => {
        test("simple space", () => {
            const groceries = create(
                { fruits: "fruit[]" },
                narrow({
                    space: {
                        dictionary: {
                            banana: {
                                length: "number",
                                description: "string?"
                            },
                            apple: { circumference: "number", type: "string" },
                            fruit: "banana|apple"
                        }
                    }
                })
            )
            expect(
                groceries.validate({
                    fruits: [
                        { length: 10 },
                        { circumference: 4.832321, type: "Granny Smith" },
                        { length: 15, description: "nice" }
                    ]
                }).error
            ).toBeFalsy()
            expect(
                groceries.validate(
                    {
                        fruits: [
                            {
                                length: 5000,
                                description: "I'm a big banana!",
                                peel: "slippery"
                            },
                            { type: "Fuji" }
                        ]
                    },
                    // Verbose should explain why each component of the union type doesn't apply
                    { verbose: true }
                ).error
            ).toMatchInlineSnapshot(`
        "Encountered errors at the following paths:
        {
          fruits/0: '{length: 5000, description: 'I'm a big banana!', peel: 'slippery'} is not assignable to any of banana|apple.
        Encountered errors at the following paths:
        {
          banana: 'At path fruits/0, keys 'peel' were unexpected.',
          apple: 'At path fruits/0, required keys 'circumference, type' were missing. Keys 'length, description, peel' were unexpected.'
        }',
          fruits/1: '{type: 'Fuji'} is not assignable to any of banana|apple.
        Encountered errors at the following paths:
        {
          banana: 'At path fruits/1, required keys 'length' were missing. Keys 'type' were unexpected.',
          apple: 'At path fruits/1, required keys 'circumference' were missing.'
        }'
        }"
        `)
        })
        // test("errors on shallow cycle", () => {
        //     // @ts-expect-error
        //     const shallowRecursive = compile({ a: "a" })
        //     expect(() =>
        //         shallowRecursive.models.a.assert("what's an a?")
        //     ).toThrowError("shallow")
        //     // @ts-expect-error
        //     const shallowCyclic = compile({ a: "b", b: "c", c: "a|b|c" })
        //     expect(() =>
        //         shallowCyclic.models.a.assert(["what's a b?"])
        //     ).toThrowError("shallow")
        // })
        test("cyclic space", () => {
            const bicycle = create(
                { a: "a", b: "b", c: "either[]" },
                narrow({
                    space: {
                        dictionary: {
                            a: { a: "a?", b: "b?", isA: "true" },
                            b: { a: "a?", b: "b?", isA: "false" },
                            either: "a|b"
                        }
                    }
                })
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
                }).error
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
                }).error
            ).toMatchInlineSnapshot(`
        "Encountered errors at the following paths:
        {
          a/a/a/a/a/a/a/isA: 'false is not assignable to true.',
          b/b/b/b/b/b/b/isA: 'true is not assignable to false.',
          c/8: '{isA: 'the duck goes quack'} is not assignable to any of a|b.'
        }"
        `)
        })
        test("doesn't try to parse or validate any", () => {
            // Parse any as type
            assert(create({} as any).type).typed as any
            // Parse any as space
            const parseWithAnySpace = () =>
                create(
                    { literal: "string", alias: "myType" },
                    { space: {} as any }
                ).type
            assert(parseWithAnySpace).typed as () => {
                literal: string
                alias: any
            }
            assert(parseWithAnySpace)
                .throws()
                .snap(
                    `"Unable to determine the type of 'myType' at path alias."`
                )
            // Parse any as space member
            assert(
                create(["number", "a"], {
                    space: { dictionary: { a: {} as any } }
                }).type
            ).typed as [number, any]
        })
    })
    describe("generation", () => {
        test("simple space", () => {
            expect(
                create(
                    {
                        fruits: "fruit[]",
                        bestBanana: "banana",
                        bestApple: "apple",
                        bestFruit: "fruit",
                        optionalFruit: "fruit?"
                    },
                    narrow({
                        space: {
                            dictionary: {
                                banana: {
                                    length: "number",
                                    description: "string?"
                                },
                                apple: {
                                    circumference: "number",
                                    type: "string"
                                },
                                fruit: "banana|apple"
                            }
                        }
                    })
                ).generate()
            ).toStrictEqual({
                fruits: [],
                bestBanana: { length: 0 },
                bestApple: { circumference: 0, type: "" },
                bestFruit: { length: 0 }
            })
        })
        test("optional cycle", () => {
            // If it's optional, the cycle should be ignored and just return undefined
            expect(
                create(
                    "a",
                    narrow({
                        space: {
                            dictionary: {
                                a: { b: "b" },
                                b: { c: "c?" },
                                c: "a|b"
                            }
                        }
                    })
                ).generate()
            ).toStrictEqual({ b: {} })
        })
        test("required cycle", () => {
            expect(() =>
                create(
                    "a",
                    narrow({
                        space: {
                            dictionary: {
                                a: { b: "b" },
                                b: { c: "c" },
                                c: "a|b"
                            }
                        }
                    })
                ).generate()
            ).toThrowErrorMatchingInlineSnapshot(`
                    "Unable to generate a default value for type including a required cycle:
                    a=>b=>c=>a
                    If you'd like to avoid throwing in when this occurs, pass a value to return when this occurs to the 'onRequiredCycle' option."
                `)
        })
        test("onRequiredCycle", () => {
            expect(
                create(
                    "a",
                    narrow({
                        space: {
                            dictionary: {
                                a: { b: "b" },
                                b: { c: "c" },
                                c: "a|b"
                            }
                        }
                    })
                ).generate({ onRequiredCycle: { whoops: ["cycle"] } })
            ).toStrictEqual({
                b: { c: { whoops: ["cycle"] } }
            })
        })
        test("onRequiredCycle with union", () => {
            expect(
                create(
                    "a|b",
                    narrow({
                        space: {
                            dictionary: {
                                a: { b: "b" },
                                b: { a: "a" }
                            }
                        }
                    })
                ).generate({ onRequiredCycle: "cycle" })
            ).toStrictEqual({ b: { a: "cycle" } })
        })
        test("from parsed", () => {
            const defaultValue = create(
                {
                    requiredGroup: "group",
                    requiredGroups: "group[]",
                    optionalGroup: "group?",
                    optionalGroups: "group[]?"
                },
                narrow({
                    space: {
                        dictionary: {
                            group: { name: "string", description: "string?" }
                        }
                    }
                })
            ).generate()
            expect(defaultValue).toStrictEqual({
                requiredGroup: { name: "" },
                requiredGroups: []
            })
        })
    })
}
