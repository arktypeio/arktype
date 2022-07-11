import { assert } from "@re-/assert"
import { space } from "../../src/index.js"

describe("space", () => {
    it("single", () => {
        assert(space({ a: "string" }).$meta.types.a).typed as string
        assert(() =>
            // @ts-expect-error
            space({ a: "strig" }, { parse: { eager: true } })
        ).throwsAndHasTypeError("Unable to determine the type of 'strig'.")
    })
    it("independent", () => {
        assert(space({ a: "string", b: { c: "boolean" } }).$meta.types.b)
            .typed as {
            c: boolean
        }
        assert(() =>
            space(
                // @ts-expect-error
                { a: "string", b: { c: "uhoh" } },
                { parse: { eager: true } }
            )
        ).throwsAndHasTypeError("Unable to determine the type of 'uhoh'")
    })
    it("interdependent", () => {
        assert(space({ a: "string", b: { c: "a" } }).$meta.types.b.c)
            .typed as string
        assert(() =>
            // @ts-expect-error
            space({ a: "yikes", b: { c: "a" } }, { parse: { eager: true } })
        ).throwsAndHasTypeError("Unable to determine the type of 'yikes'")
    })
    it("cyclic", () => {
        const cyclicSpace = space({ a: { b: "b" }, b: { a: "a" } })
        // Type hint displays as any on hitting cycle
        assert(cyclicSpace.$meta.types.a).typed as {
            b: {
                a: {
                    b: {
                        a: any
                    }
                }
            }
        }
        // But still yields correct types when properties are accessed
        assert(cyclicSpace.$meta.types.b.a.b.a.b.a.b.a).typed as {
            b: {
                a: any
            }
        }
        // @ts-expect-error
        assert(cyclicSpace.$meta.types.a.b.a.b.c).type.errors.snap(
            `Property 'c' does not exist on type '{ a: { b: ...; }; }'.`
        )
    })
    it("cyclic eager", () => {
        const cyclicEagerSpace = space(
            { a: { b: "b" }, b: { a: "a" } },
            { parse: { eager: true } }
        )
        assert(cyclicEagerSpace.$meta.types.a).typed as {
            b: {
                a: {
                    b: {
                        a: any
                    }
                }
            }
        }
        assert(cyclicEagerSpace.a.validate({ b: {} }).error)
    })
    it("object list", () => {
        assert(space({ a: "string", b: [{ c: "a" }] }).$meta.types.b).typed as [
            {
                c: string
            }
        ]
    })
    it("doesn't try to validate any as a dictionary", () => {
        const parseWithAnySpace = space({} as any).$meta.model({
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
        assert(space({ a: {} as any }).$meta.model(["number", "a"]).type)
            .typed as [number, any]
    })
    it("model from space", () => {
        const anotherCyclicSpace = space({ a: { b: "b" }, b: { a: "a" } })
        assert(anotherCyclicSpace.$meta.model("a|b|null").type).typed as
            | { b: { a: { b: { a: any } } } }
            | { a: { b: { a: { b: any } } } }
            | null
        assert(() =>
            anotherCyclicSpace.$meta.model(
                // @ts-expect-error
                { nested: { a: "a", b: "b", c: "c" } },
                { parse: { eager: true } }
            )
        ).throwsAndHasTypeError("Unable to determine the type of 'c'")
    })
    it("with onCycle option", () => {
        const cyclic = space({
            $meta: {
                onCycle: {
                    cyclic: "$cyclic?"
                }
            },
            a: { b: "b", isA: "true", isB: "false" },
            b: { a: "a", isA: "false", isB: "true" }
        }).$meta.model({
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
            $meta: {
                onResolve: {
                    wasResolved: "true",
                    resolvedType: "$resolution"
                }
            },
            a: { b: "b", isA: "true", isB: "false" },
            b: { a: "a", isA: "false", isB: "true" }
        }).$meta.model({
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
