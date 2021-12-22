import { assert } from "@re-/assert"
import { typespace, model } from ".."
import { typeDefProxy, definitionTypeErrorTemplate } from "../internal.js"

describe("definitions", () => {
    test("keyword", () => {
        assert(model("string").type).typed as string
        // @ts-expect-error
        assert(() => model("strig")).throwsAndHasTypeError(
            "Unable to determine the type of 'strig'."
        )
    })
    test("string", () => {
        assert(model("string|number[]?").type).typed as
            | string
            | number[]
            | undefined
        // @ts-expect-error
        assert(() => model("string|[]number")).throwsAndHasTypeError(
            "Unable to determine the type of '[]number'."
        )
    })
    test("string literals", () => {
        assert(model("'hello'").type).typed as "hello"
        // As of TS 4.5, I don't think it's possible to parse a number literal from a string type
        // Runtime functionality like "getDefault" and "validate" will still use the more specific
        // value, but the TS type is inferred as "number"
        assert(model("4").type).typed as number
        assert(model("1.234").type).typed as number
    })
    // Using actual numbers solves the above type widening to "number",
    // but isn't available directly in the context of string types like lists or functions
    test("primitives", () => {
        assert(model(0).type).typed as 0
        // Repeating, of course
        assert(model(32.33).type).typed as 32.33
        assert(model(0n).type).typed as 0n
        assert(model(99999999999999999999n).type).typed as 99999999999999999999n
        assert(model(true).type).typed as true
        assert(model(false).type).typed as false
        assert(model(undefined).type).typed as undefined
        assert(model(null).type).typed as null
    })
    test("string function", () => {
        assert(model("(string, number) => boolean[]").type).typed as (
            args_0: string,
            args_1: number
        ) => boolean[]
        assert(model("()=>void").type).typed as () => void
        // @ts-expect-error
        assert(() => model("()=>").type).throwsAndHasTypeError(
            "Unable to determine the type of ''."
        )
        assert(() =>
            // @ts-expect-error
            model("(foop, string, nufmber) => boolean[]")
        )
            .throws("Unable to determine the type of 'foop'.")
            .type.errors(
                /Unable to determine the type of 'foop'[\s\S]*Unable to determine the type of 'nufmber'/
            )
        // @ts-expect-error
        assert(() => model("()=>fork")).throwsAndHasTypeError(
            "Unable to determine the type of 'fork'."
        )
    })
    test("empty object/tuple", () => {
        assert(model({}).type).typed as {}
        assert(model([]).type).typed as []
    })
    test("object", () => {
        assert(
            model({
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
        assert(() => model({ a: { b: "whoops" } }))
            .throws("Unable to determine the type of 'whoops' at path a/b.")
            .type.errors("Unable to determine the type of 'whoops'")
    })
    test("bad type def type", () => {
        // @ts-expect-error
        assert(() => model({ bad: Symbol() })).throwsAndHasTypeError(
            definitionTypeErrorTemplate
        )
        // @ts-expect-error
        assert(() => model({ bad: () => {} })).throwsAndHasTypeError(
            definitionTypeErrorTemplate
        )
    })
    test("with typespace", () => {
        assert(
            model("borf", {
                typespace: { borf: true }
            }).type
        ).typed as true
        assert(
            model(
                { snorf: "borf[]" },
                { typespace: { borf: { f: false, u: undefined } } }
            ).type
        ).typed as { snorf: { f: false; u: undefined }[] }
    })
    test("list definition", () => {
        assert(model([{ a: null }, { b: "string?" }]).type).typed as [
            {
                a: null
            },
            {
                b?: string | undefined
            }
        ]
        assert(
            model({
                nestedList: [0n, { yes: "null|true" }]
            }).type
        ).typed as { nestedList: [0n, { yes: true | null }] }
    })
    test("whitespace is ignored when parsing strings", () => {
        assert(model("    boolean      |    null       ").type).typed as
            | boolean
            | null
        assert(model({ nested: "number|    true" }).type).typed as {
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
        assert(model({} as any).type).typed as any
        // Parse any as typespace
        const parseWithAnyTypespace = () =>
            model(
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
        assert(model(["number", "a"], { typespace: { a: {} as any } }).type)
            .typed as [number, any]
    })
    test("parse result", () => {
        const parseResult = model("a", {
            typespace: { a: "true" }
        })
        expect(parseResult.definition).toBe("a")
        expect(parseResult.typespace).toStrictEqual({ a: "true" })
        expect(parseResult.assert(true)).toBe(undefined)
        expect(parseResult.check(true)).toBe("")
        expect(parseResult.check(true)).toBe("")
        expect(parseResult.generate()).toBe(true)
        expect(parseResult.type).toBe(typeDefProxy)
    })
})
