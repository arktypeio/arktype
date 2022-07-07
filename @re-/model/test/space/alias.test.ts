import { assert } from "@re-/assert"
import { model, space } from "../../src/index.js"

describe("alias", () => {
    describe("type", () => {
        it("with space", () => {
            assert(space({ borf: true }).meta.model("borf").type).typed as true
            assert(
                space({
                    borf: { f: false, u: undefined }
                }).meta.model({ snorf: "borf[]" }).type
            ).typed as { snorf: { f: false; u: undefined }[] }
        })
        it("with onCycle option", () => {
            const cyclic = space({
                __meta__: {
                    onCycle: {
                        cyclic: "cyclic?"
                    }
                },
                a: { b: "b", isA: "true", isB: "false" },
                b: { a: "a", isA: "false", isB: "true" }
            }).meta.model({
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
            const withOnResolve = space({
                __meta__: {
                    onResolve: {
                        wasResolved: "true",
                        resolvedType: "resolution"
                    }
                },
                a: { b: "b", isA: "true", isB: "false" },
                b: { a: "a", isA: "false", isB: "true" }
            }).meta.model({
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
            const groceries = space({
                banana: {
                    length: "number",
                    description: "string?"
                },
                apple: { circumference: "number", type: "string" },
                fruit: "banana|apple"
            }).meta.model({ fruits: "fruit[]" })
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
                groceries.validate({
                    fruits: [
                        {
                            length: 5000,
                            description: "I'm a big banana!",
                            peel: "slippery"
                        },
                        { type: "Fuji" }
                    ]
                }).error?.message
            ).snap(`Encountered errors at the following paths:
  fruits/0: {length: 5000, description: "I'm a big banana!", peel: "slippery"} is not assignable to any of banana|apple.
  fruits/1: {type: "Fuji"} is not assignable to any of banana|apple.
`)
        })
        it("errors on shallow cycle", () => {
            // @ts-expect-error
            assert(() => space({ a: "a" })).throwsAndHasTypeError(
                `Error: a references a shallow cycle: a=>a.`
            )
            assert(() =>
                // @ts-expect-error
                space({ a: "b", b: "c", c: "a|b|c" })
            ).throwsAndHasTypeError(`a references a shallow cycle: a=>b=>c=>a`)
        })
        it("cyclic space", () => {
            const bicycle = space({
                a: { a: "a?", b: "b?", isA: "true" },
                b: { a: "a?", b: "b?", isA: "false" },
                either: "a|b"
            }).meta.model({ a: "a", b: "b", c: "either[]" })
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
                }).error?.message
            ).snap(`Encountered errors at the following paths:
  a/a/a/a/a/a/a/isA: false is not assignable to true.
  b/b/b/b/b/b/b/isA: true is not assignable to false.
  c/8: {isA: "the duck goes quack"} is not assignable to any of a|b.
`)
        })
        it("doesn't try to validate any as a model definition", () => {
            assert(model({} as any).type).typed as any
        })
        it("doesn't try to validate any as a dictionary", () => {
            const parseWithAnySpace = space({} as any).meta.model({
                literal: "string",
                // @ts-ignore
                alias: "myType"
            })
            assert(parseWithAnySpace.type).typed as {
                alias: unknown
                literal: string
            }
            assert(() =>
                parseWithAnySpace.validate({ literal: "", alias: "" })
            ).throws.snap(
                `Error: Unable to determine the type of 'myType' at path alias.`
            )
        })
        it("doesn't try to validate any as a dictionary member", () => {
            assert(space({ a: {} as any }).meta.model(["number", "a"]).type)
                .typed as [number, any]
        })
    })
    describe("generation", () => {
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
                }).meta.model({
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
                    .meta.model("a")
                    .create()
            ).equals({ b: {} })
        })
        it("required cycle", () => {
            const cyclicSpace = space({
                a: { b: "b" },
                b: { c: "c" },
                c: "a|b"
            })
            assert(() => cyclicSpace.meta.model("a").create()).throws.snap(
                `Error: Unable to generate a value for 'a|b': None of the definitions can be generated.`
            )
            assert(() => cyclicSpace.meta.model("a").create({ verbose: true }))
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
                    .meta.model("a")
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
                    .meta.model("a|b")
                    .create({ onRequiredCycle: "cycle" })
            ).value.equals({ b: { a: "cycle" } })
        })
        it("from parsed", () => {
            const defaultValue = space({
                group: { name: "string", description: "string?" }
            })
                .meta.model({
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
})
