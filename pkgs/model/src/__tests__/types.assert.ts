import { assert } from "@re-/assert"
import { compile, define } from ".."
import { typeDefProxy, definitionTypeErrorTemplate } from "../internal.js"

describe("types", () => {
    describe("string", () => {
        test("keyword", () => {
            assert(define("string").type).typed as string
            // @ts-expect-error
            assert(() => define("strig")).throwsAndHasTypeError(
                "Unable to determine the type of 'strig'."
            )
        })
        describe("expression", () => {
            test("optional", () => {
                assert(define("null?").type).typed as null | undefined
                // @ts-expect-error
                assert(() => define("str?ing")).throwsAndHasTypeError(
                    "Unable to determine the type of 'str?ing'."
                )
            })
            test("arrow function", () => {
                assert(define("(string, number) => boolean[]").type).typed as (
                    args_0: string,
                    args_1: number
                ) => boolean[]
                assert(define("()=>void").type).typed as () => void
                // @ts-expect-error
                assert(() => define("()=>").type).throwsAndHasTypeError(
                    "Unable to determine the type of ''."
                )
                assert(() =>
                    // @ts-expect-error
                    define("(foop, string, nufmber) => boolean[]")
                )
                    .throws("Unable to determine the type of 'foop'.")
                    .type.errors(
                        /Unable to determine the type of 'foop'[\s\S]*Unable to determine the type of 'nufmber'/
                    )
                // @ts-expect-error
                assert(() => define("()=>fork")).throwsAndHasTypeError(
                    "Unable to determine the type of 'fork'."
                )
            })
            test("union", () => {
                assert(define("'yes'|'no'|'maybe'").type)
            })
            test("precedence", () => {
                assert(define("(string|number[])=>void?").type).typed as
                    | ((args_0: string | number[]) => void)
                    | undefined
            })
        })
        describe("literal", () => {
            test("string", () => {
                //Supports single and double quotes
                assert(define("'hello'").type).typed as "hello"
                assert(define('"goodbye"').type).typed as "goodbye"
            })
            test("number", () => {
                // As of TS 4.5, I don't think it's possible to parse a number literal from a string type
                // Runtime functionality like "getDefault" and "validate" will still use the more specific
                // value, but the TS type is inferred as "number"
                assert(define("4").type).typed as number
                assert(define("1.234").type).typed as number
            })
            test("bigintz", () => {
                assert(define("999999999999999n").type).typed as bigint
                assert(define("-1n").type).typed as bigint
                // @ts-expect-error
                assert(() => define("99999.99n")).throwsAndHasTypeError(
                    "Unable to determine the type of '99999.99n'."
                )
            })
        })
    })
    describe("primitive", () => {
        test("number", () => {
            assert(define(0).type).typed as 0
            // Repeating, of course
            assert(define(32.33).type).typed as 32.33
        })
        test("bigint", () => {
            assert(define(0n).type).typed as 0n
            assert(define(99999999999999999999n).type)
                .typed as 99999999999999999999n
        })
        test("boolean", () => {
            assert(define(true).type).typed as true
            assert(define(false).type).typed as false
        })
        test("null", () => {
            assert(define(null).type).typed as null
        })
        test("undefined", () => {
            assert(define(undefined).type).typed as undefined
        })
    })
    describe("object", () => {
        test("empty", () => {
            assert(define({}).type).typed as {}
            assert(define([]).type).typed as []
        })
        test("map", () => {
            assert(
                define({
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
            assert(() => define({ a: { b: "whoops" } }))
                .throws("Unable to determine the type of 'whoops' at path a/b.")
                .type.errors("Unable to determine the type of 'whoops'")
        })
    })

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
    test("list definition", () => {
        assert(define([{ a: null }, { b: "string?" }]).type).typed as [
            {
                a: null
            },
            {
                b?: string | undefined
            }
        ]
        assert(
            define({
                nestedList: [0n, { yes: "null|true" }]
            }).type
        ).typed as { nestedList: [0n, { yes: true | null }] }
    })
    test("whitespace is ignored when parsing strings", () => {
        assert(define("    boolean      |    null       ").type).typed as
            | boolean
            | null
        assert(define({ nested: "number|    true" }).type).typed as {
            nested: number | true
        }
    })
    const getCyclicSpace = () =>
        compile(
            { a: { b: "b", isA: "true", isB: "false" } },
            { b: { a: "a", isA: "false", isB: "true" } }
        )
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
