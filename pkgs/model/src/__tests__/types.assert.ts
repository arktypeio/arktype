import { assert } from "@re-/assert"
import { compile, define } from ".."
import { typeDefProxy, definitionTypeErrorTemplate } from "../internal.js"

describe("types", () => {
    test("bad type def type", () => {
        // @ts-expect-error
        assert(() => define({ bad: Symbol() })).throwsAndHasTypeError(
            definitionTypeErrorTemplate
        )
        // @ts-expect-error
        assert(() => define({ bad: () => {} })).throwsAndHasTypeError(
            definitionTypeErrorTemplate
        )
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
