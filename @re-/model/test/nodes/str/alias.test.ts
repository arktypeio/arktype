import { assert } from "@re-/assert"
import { compile, model } from "#api"

describe("alias", () => {
    describe("type", () => {
        it("with space", () => {
            assert(compile({ borf: true }).create("borf").type).typed as true
            assert(
                compile({
                    borf: { f: false, u: undefined }
                }).create({ snorf: "borf[]" }).type
            ).typed as { snorf: { f: false; u: undefined }[] }
        })
        it("with onCycle option", () => {
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
                `{ b: { a: { b: { cyclic?: { a: { b: { a: { cyclic?: { b: { a: { b: any; isA: true; isB: false; }; isA: false; isB: true; }; isA: true; isB: false; } | undefined; }; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; } | undefined; }; isA: true; isB: false; }; isA: false; isB: true; }; isA: true; isB: false; } | undefined`
            )
            assert(cyclic.type.b.a.b.cyclic).type.toString.snap(
                `{ a: { b: { a: { cyclic?: { b: { a: { b: { cyclic?: { a: { b: { a: any; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; } | undefined; }; isA: true; isB: false; }; isA: false; isB: true; }; isA: true; isB: false; } | undefined; }; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; } | undefined`
            )
            assert(cyclic.type.a.b.a.cyclic?.b.a.b.cyclic).type.toString.snap(
                `{ a: { b: { a: { cyclic?: { b: { a: { b: { cyclic?: { a: { b: { a: any; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; } | undefined; }; isA: true; isB: false; }; isA: false; isB: true; }; isA: true; isB: false; } | undefined; }; isA: false; isB: true; }; isA: true; isB: false; }; isA: false; isB: true; } | undefined`
            )
        })
        it("with onResolve option", () => {
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
        it("simple space", () => {
            const groceries = compile({
                banana: {
                    length: "number",
                    description: "string?"
                },
                apple: { circumference: "number", type: "string" },
                fruit: "banana|apple"
            }).create({ fruits: "fruit[]" })
            assert(
                groceries.validate({
                    fruits: [
                        { length: 10 },
                        { circumference: 4.832_321, type: "Granny Smith" },
                        { length: 15, description: "nice" }
                    ]
                }).error
            ).equals(undefined)
            assert(
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
            ).snap(`Encountered errors at the following paths:
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
}`)
        })
        /*
         * it("errors on shallow cycle", () => {
         *     // @ts-expect-error
         *     const shallowRecursive = compile({ a: "a" })
         *     assert(() =>
         *         shallowRecursive.models.a.assert("what's an a?")
         *     ).throws("shallow")
         *     // @ts-expect-error
         *     const shallowCyclic = compile({ a: "b", b: "c", c: "a|b|c" })
         *     assert(() =>
         *         shallowCyclic.models.a.assert(["what's a b?"])
         *     ).throws("shallow")
         * })
         */
        it("cyclic space", () => {
            const bicycle = compile({
                a: { a: "a?", b: "b?", isA: "true" },
                b: { a: "a?", b: "b?", isA: "false" },
                either: "a|b"
            }).create({ a: "a", b: "b", c: "either[]" })
            assert(
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
            ).equals(undefined)
            assert(
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
            ).snap(`Encountered errors at the following paths:
{
  a/a/a/a/a/a/a/isA: 'false is not assignable to true.',
  b/b/b/b/b/b/b/isA: 'true is not assignable to false.',
  c/8: '{isA: 'the duck goes quack'} is not assignable to any of a|b.'
}`)
        })
        it("doesn't try to validate any as a model definition", () => {
            assert(model({} as any).type).typed as any
        })
        it("doesn't try to validate any as a dictionary", () => {
            const parseWithAnySpace = () =>
                compile({} as any).create({
                    literal: "string",
                    // @ts-ignore
                    alias: "myType"
                }).type
            assert(parseWithAnySpace).typed as () => {
                alias: any
                literal: string
            }
            assert(parseWithAnySpace)
                .throws()
                .snap(
                    `Error: Unable to determine the type of 'myType' at path alias.`
                )
        })
        it("doesn't try to validate any as a dictionary member", () => {
            assert(compile({ a: {} as any }).create(["number", "a"]).type)
                .typed as [number, any]
        })
    })
    describe("generation", () => {
        it("simple space", () => {
            assert(
                compile({
                    banana: {
                        length: "number",
                        description: "string?"
                    },
                    apple: {
                        circumference: "number",
                        type: "string"
                    },
                    fruit: "banana|apple"
                })
                    .create({
                        fruits: "fruit[]",
                        bestBanana: "banana",
                        bestApple: "apple",
                        bestFruit: "fruit",
                        optionalFruit: "fruit?"
                    })
                    .generate()
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
                compile({
                    a: { b: "b" },
                    b: { c: "c?" },
                    c: "a|b"
                })
                    .create("a")
                    .generate()
            ).equals({ b: {} })
        })
        it("required cycle", () => {
            assert(() =>
                compile({
                    a: { b: "b" },
                    b: { c: "c" },
                    c: "a|b"
                })
                    .create("a")
                    .generate()
            ).throws
                .snap(`Error: Unable to generate a default value for type including a required cycle:
a=>b=>c=>a
If you'd like to avoid throwing in when this occurs, pass a value to return when this occurs to the 'onRequiredCycle' option.`)
        })
        it("onRequiredCycle", () => {
            // assert(
            //     model(
            //         "a",
            //         narrow({
            //             space: {
            //                 dictionary: {
            //                     a: { b: "b" },
            //                     b: { c: "c" },
            //                     c: "a|b"
            //                 }
            //             }
            //         })
            //     ).generate({ onRequiredCycle: { whoops: ["cycle"] } })
            // ).value.equals({
            //     b: { c: { whoops: ["cycle"] } }
            // })
        })
        it("onRequiredCycle with union", () => {
            // assert(
            //     model(
            //         "a|b",
            //         narrow({
            //             space: {
            //                 dictionary: {
            //                     a: { b: "b" },
            //                     b: { a: "a" }
            //                 }
            //             }
            //         })
            //     ).generate({ onRequiredCycle: "cycle" })
            // ).value.equals({ b: { a: "cycle" } })
        })
        it("from parsed", () => {
            const defaultValue = compile({
                group: { name: "string", description: "string?" }
            })
                .create({
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
})
