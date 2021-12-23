import { assert } from "@re-/assert"
import { typespace, define as def } from ".."
import { typeDefProxy, definitionTypeErrorTemplate } from "../internal.js"

export const user = def(
    {
        name: "string",
        bestFriend: "user?",
        groups: "group[]"
    },
    { typespace: {} as any }
)

describe("definitions", () => {
    test("keyword", () => {
        assert(def("string").type).typed as string
        // @ts-expect-error
        assert(() => def("strig")).throwsAndHasTypeError(
            "Unable to determine the type of 'strig'."
        )
    })
    test("string", () => {
        assert(def("string|number[]?").type).typed as
            | string
            | number[]
            | undefined
        // @ts-expect-error
        assert(() => def("string|[]number")).throwsAndHasTypeError(
            "Unable to determine the type of '[]number'."
        )
    })
    test("string literals", () => {
        assert(def("'hello'").type).typed as "hello"
        // As of TS 4.5, I don't think it's possible to parse a number literal from a string type
        // Runtime functionality like "getDefault" and "validate" will still use the more specific
        // value, but the TS type is inferred as "number"
        assert(def("4").type).typed as number
        assert(def("1.234").type).typed as number
    })
    // Using actual numbers solves the above type widening to "number",
    // but isn't available directly in the context of string types like lists or functions
    test("primitives", () => {
        assert(def(0).type).typed as 0
        // Repeating, of course
        assert(def(32.33).type).typed as 32.33
        assert(def(0n).type).typed as 0n
        assert(def(99999999999999999999n).type).typed as 99999999999999999999n
        assert(def(true).type).typed as true
        assert(def(false).type).typed as false
        assert(def(undefined).type).typed as undefined
        assert(def(null).type).typed as null
    })
    test("string function", () => {
        assert(def("(string, number) => boolean[]").type).typed as (
            args_0: string,
            args_1: number
        ) => boolean[]
        assert(def("()=>void").type).typed as () => void
        // @ts-expect-error
        assert(() => def("()=>").type).throwsAndHasTypeError(
            "Unable to determine the type of ''."
        )
        assert(() =>
            // @ts-expect-error
            def("(foop, string, nufmber) => boolean[]")
        )
            .throws("Unable to determine the type of 'foop'.")
            .type.errors(
                /Unable to determine the type of 'foop'[\s\S]*Unable to determine the type of 'nufmber'/
            )
        // @ts-expect-error
        assert(() => def("()=>fork")).throwsAndHasTypeError(
            "Unable to determine the type of 'fork'."
        )
    })
    test("empty object/tuple", () => {
        assert(def({}).type).typed as {}
        assert(def([]).type).typed as []
    })
    test("object", () => {
        assert(
            def({
                a: "string",
                b: "true|number?",
                c: { nested: "null[]" },
                d: 6
            }).type
        ).typed as {
            b?: number | true | undefined
            a: string
            c: { nested: null[] }
            d: 6
        }
        // @ts-expect-error
        assert(() => def({ a: { b: "whoops" } }))
            .throws("Unable to determine the type of 'whoops' at path a/b.")
            .type.errors("Unable to determine the type of 'whoops'")
    })
    test("bad type def type", () => {
        // @ts-expect-error
        assert(() => def({ bad: Symbol() })).throwsAndHasTypeError(
            definitionTypeErrorTemplate
        )
        // @ts-expect-error
        assert(() => def({ bad: () => {} })).throwsAndHasTypeError(
            definitionTypeErrorTemplate
        )
    })
    test("with typespace", () => {
        assert(
            def("borf", {
                typespace: { borf: true }
            }).type
        ).typed as true
        assert(
            def(
                { snorf: "borf[]" },
                { typespace: { borf: { f: false, u: undefined } } }
            ).type
        ).typed as { snorf: { f: false; u: undefined }[] }
    })
    test("list definition", () => {
        assert(def([{ a: null }, { b: "string?" }]).type).typed as [
            {
                a: null
            },
            {
                b?: string | undefined
            }
        ]
        assert(
            def({
                nestedList: [0n, { yes: "null|true" }]
            }).type
        ).typed as { nestedList: [0n, { yes: true | null }] }
    })
    test("whitespace is ignored when parsing strings", () => {
        assert(def("    boolean      |    null       ").type).typed as
            | boolean
            | null
        assert(def({ nested: "number|    true" }).type).typed as {
            nested: number | true
        }
    })
    const getCyclicTypespace = () =>
        typespace(
            { a: { b: "b", isA: "true", isB: "false" } },
            { b: { a: "a", isA: "false", isB: "true" } }
        )
    test("with onCycle option", () => {
        const { type } = getCyclicTypespace().parse(
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
        const { type } = getCyclicTypespace().parse(
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
        const { type } = getCyclicTypespace().parse(
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
        assert(def({} as any).type).typed as any
        // Parse any as typespace
        const parseWithAnyTypespace = () =>
            def(
                { literal: "string", alias: "myType" },
                { typespace: {} as any }
            ).type
        assert(parseWithAnyTypespace).typed as () => {
            literal: string
            alias: any
        }
        assert(parseWithAnyTypespace)
            .throws()
            .snap(`"Unable to determine the type of 'myType' at path alias."`)
        // Parse any as typespace member
        assert(def(["number", "a"], { typespace: { a: {} as any } }).type)
            .typed as [number, any]
    })
    test("model props", () => {
        const a = def("a", {
            typespace: { a: "true" }
        })
        expect(a.definition).toBe("a")
        expect(a.typespace).toStrictEqual({ a: "true" })
        expect(a.validate(true)).toBeFalsy()
        expect(() => a.validate(false)).toThrow()
        expect(a.generate()).toBe(true)
        expect(a.type).toBe(typeDefProxy)
    })
})
