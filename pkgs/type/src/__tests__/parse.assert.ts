import { assert } from "@re-do/assert"
import { compile, parse } from ".."
import { typeDefProxy } from "../internal.js"

describe("parse", () => {
    test("built-in", () => {
        assert(parse("string").type).typed as string
        // @ts-expect-error
        assert(() => parse("strig")).throwsAndHasTypeError(
            "Unable to determine the type of 'strig'."
        )
    })
    test("string", () => {
        assert(parse("string|number[]?").type).typed as
            | string
            | number[]
            | undefined
        // @ts-expect-error
        assert(() => parse("string|[]number")).throwsAndHasTypeError(
            "Unable to determine the type of '[]number'."
        )
    })
    test("string literals", () => {
        assert(parse("'hello'").type).typed as "hello"
        // As of TS 4.5, I don't think it's possible to parse a number literal from a string type
        // Runtime functionality like "getDefault" and "validate" will still use the more specific
        // value, but the TS type is inferred as "number"
        assert(parse("4").type).typed as number
        assert(parse("1.234").type).typed as number
    })
    // Using actual numbers solves the above type widening to "number",
    // but isn't available directly in the context of string types like lists or functions
    test("number literals", () => {
        assert(parse(0).type).typed as 0
        // Repeating, of course
        assert(parse(32.33).type).typed as 32.33
    })
    test("string function", () => {
        assert(parse("(string, number) => boolean[]").type).typed as (
            args_0: string,
            args_1: number
        ) => boolean[]
        assert(parse("()=>void").type).typed as () => void
        // @ts-expect-error
        assert(() => parse("()=>").type).throwsAndHasTypeError(
            "Unable to determine the type of ''."
        )
        assert(() =>
            // @ts-expect-error
            parse("(foop, string, nufmber) => boolean[]")
        )
            .throws("Unable to determine the type of 'foop'.")
            .type.errors(
                /Unable to determine the type of 'foop'[\s\S]*Unable to determine the type of 'nufmber'/
            )
        // @ts-expect-error
        assert(() => parse("()=>fork")).throwsAndHasTypeError(
            "Unable to determine the type of 'fork'."
        )
    })
    test("empty object/tuple", () => {
        assert(parse({}).type).typed as {}
        assert(parse([]).type).typed as []
    })
    test("object", () => {
        assert(
            parse({
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
        assert(() => parse({ a: { b: "whoops" } }))
            .throws("Unable to determine the type of 'whoops' at path a/b.")
            .type.errors("Unable to determine the type of 'whoops'")
    })
    test("bad type def type", () => {
        // @ts-expect-error
        assert(() => parse({ bad: true })).throwsAndHasTypeError(
            "Definitions must be strings, numbers, or objects."
        )
    })
    test("with typeset", () => {
        assert(
            parse("borf", {
                typeSet: { borf: "boolean" }
            }).type
        ).typed as boolean
        assert(
            parse({ snorf: "borf[]" }, { typeSet: { borf: "boolean" } }).type
        ).typed as { snorf: boolean[] }
    })
    test("list definition", () => {
        assert(parse([{ a: "boolean" }, { b: "string?" }]).type).typed as [
            {
                a: boolean
            },
            {
                b?: string | undefined
            }
        ]
        assert(
            parse({
                nestedList: ["string", { yes: "null|true" }]
            }).type
        ).typed as { nestedList: [string, { yes: true | null }] }
    })
    test("whitespace is ignored when parsing strings", () => {
        assert(parse("    boolean      |    null       ").type).typed as
            | boolean
            | null
        assert(parse({ nested: "number|    true" }).type).typed as {
            nested: number | true
        }
    })
    const getCyclicTypeSet = () =>
        compile(
            { a: { b: "b", isA: "true", isB: "false" } },
            { b: { a: "a", isA: "false", isB: "true" } }
        )
    test("with onCycle option", () => {
        const { type } = getCyclicTypeSet().parse(
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
        const { type } = getCyclicTypeSet().parse(
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
        const { type } = getCyclicTypeSet().parse(
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
        assert(parse({} as any).type).typed as any
        // Parse any as typeSet (in this case type could be inferred as string but impossible currently to do so)
        assert(parse("string", { typeSet: {} as any }).type).typed as any
        // Parse any as typeSet member
        assert(parse(["number", "a"], { typeSet: { a: {} as any } }).type)
            .typed as [number, any]
    })
    test("parse result", () => {
        const parseResult = parse("a", {
            typeSet: { a: "true" }
        })
        expect(parseResult.definition).toBe("a")
        expect(parseResult.typeSet).toStrictEqual({ a: "true" })
        expect(parseResult.assert(true)).toBe(undefined)
        expect(parseResult.check(true)).toBe("")
        expect(parseResult.check(true)).toBe("")
        expect(parseResult.generate()).toBe(true)
        expect(parseResult.type).toBe(typeDefProxy)
    })
})
