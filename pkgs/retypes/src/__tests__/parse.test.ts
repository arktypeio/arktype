import { compile, parse, Root } from ".."
import { expectType, expectError } from "tsd"
import { DefinitionTypeError } from "../errors.js"
import { typeDefProxy } from "../common.js"

describe("parse", () => {
    test("built-in", () => {
        const result = parse("string").type
        expectType<string>(result)
        // @ts-expect-error
        const badResult = parse("strig").type
        expectError<"Unable to determine the type of 'strig'.">(badResult)
    })
    test("string", () => {
        const result = parse("string|number[]?").type
        expectType<string | number[] | undefined>(result)
        // @ts-expect-error
        const badResult = parse("string|[]number").type
        expectError<"Unable to determine the type of '[]number'.">(badResult)
    })
    test("string literals", () => {
        const stringLiteral = parse("'hello'")
        expectType<"hello">(stringLiteral.type)
        // As of TS 4.5, I don't think it's possible to parse a number literal from a string type
        // Runtime functionality like "getDefault" and "validate" will still use the more specific
        // value, but the TS type is inferred as "number"
        const numericStringLiteral = parse("4")
        expectType<number>(numericStringLiteral.type)
        const floatStringLiteral = parse("1.234")
        expectType<number>(floatStringLiteral.type)
    })
    // Using actual numbers solves the above type widening to "number",
    // but isn't available directly in the context of string types like lists or functions
    test("number literals", () => {
        const intLiteral = parse(0)
        expectType<0>(intLiteral.type)
        // Repeating, of course
        const floatLiteral = parse(32.33)
        expectType<32.33>(floatLiteral.type)
    })
    test("string function", () => {
        const result = parse("(string, number) => boolean[]")
        expectType<(x: string, y: number) => boolean[]>(result.type)
        // const emptyFunction = parse("()=>void").type
        // expectType<() => void>(emptyFunction)
        // @ts-expect-error
        parse("()=>")
        // @ts-expect-error
        const badParameterResult = parse("(foop, string, nufmber) => boolean[]")
        expectError<
            (
                args_0: "Unable to determine the type of 'foop'.",
                args_1: string,
                args_2: "Unable to determine the type of 'nufmber'."
            ) => boolean[]
        >(badParameterResult.type)
        // @ts-expect-error
        const badReturnResult = parse("()=>fork")
        expectError<() => "Unable to determine the type of 'fork'.">(
            badReturnResult.type
        )
    })
    test("empty object", () => {
        const result = parse({})
        expectType<{}>(result)
    })
    test("object", () => {
        const result = parse({
            a: "string",
            b: "true|number?",
            c: { nested: "null[]" },
            d: 6
        })
        expectType<{
            a: string
            b?: true | number | undefined
            c: { nested: null[] }
            d: 6
        }>(result.type)
        // @ts-expect-error
        const badResult = parse({ a: { b: "whoops" } })
        expectError<{
            a: {
                b: "Unable to determine the type of 'whoops'."
            }
        }>(badResult.type)
    })
    test("bad type def type", () => {
        expect(() => {
            // @ts-expect-error
            const result = parse({ bad: true })
            expectError<{ bad: DefinitionTypeError }>(result.type)
        }).toThrowErrorMatchingInlineSnapshot(
            `"Definition value true at path bad is invalid. Definitions must be strings, numbers, or objects."`
        )
    })
    test("with typeset", () => {
        const stringResult = parse("borf", {
            typeSet: { borf: "boolean" }
        }).type
        expectType<boolean>(stringResult)
        const objectResult = parse(
            { snorf: "borf[]" },
            { typeSet: { borf: "boolean" } }
        )
        expectType<{ snorf: boolean[] }>(objectResult.type)
    })
    test("list definition", () => {
        const result = parse([{ a: "boolean" }, { b: "string?" }])
        expectType<[{ a: boolean }, { b?: string }]>(result.type)
        const nestedResult = parse({
            nestedList: ["string", { yes: "null|true" }]
        })
        expectType<{ nestedList: [string, { yes: null | true }] }>(
            nestedResult.type
        )
    })
    test("whitespace is ignored when parsing strings", () => {
        const stringResult = parse("    boolean      |    null       ").type
        expectType<boolean | null>(stringResult)
        const objectResult = parse({ nested: "number|    true" })
        expectType<{ nested: number | true }>(objectResult.type)
    })
    test("extract types referenced from string", () => {
        type Def = Root.Validate<
            "(user[],group[])=>boolean|number|null",
            "user" | "group",
            { extractTypesReferenced: true }
        >
        expectType<"number" | "boolean" | "user" | "group" | "null">({} as Def)
    })
    test("extract base names of object", () => {
        type Def = Root.Validate<
            {
                a: { b: { c: "user[]?" } }
                listed: [
                    "group|null",
                    "user|null",
                    "(string, number)=>function"
                ]
            },
            "user" | "group",
            { extractTypesReferenced: true }
        >
        expectType<{
            a: {
                b: {
                    c: "user"
                }
            }
            listed: [
                "group" | "null",
                "user" | "null",
                "string" | "number" | "function"
            ]
        }>({} as Def)
    })
    const cyclicTypeSet = compile(
        { a: { b: "b", isA: "true", isB: "false" } },
        { b: { a: "a", isA: "false", isB: "true" } }
    )
    test("with onCycle option", () => {
        const result = cyclicTypeSet.parse(
            { a: "a", b: "b" },
            {
                onCycle: {
                    cyclic: "cyclic?"
                }
            }
        )
        const cycleFromA = result.type.a.b.a.cyclic
        expectType<[true | undefined, false | undefined]>([
            cycleFromA?.isA,
            cycleFromA?.isB
        ])
        const cycleFromB = result.type.b.a.b.cyclic
        expectType<[false | undefined, true | undefined]>([
            cycleFromB?.isA,
            cycleFromB?.isB
        ])
        // After initial cycle, no more "cyclic" transformations occur since
        // "deepOnCycle" was not passed
        expectType<true | undefined>(cycleFromB?.a.b.a.b.a.b.a.b.isB)
    })
    test("with deepOnCycleOption", () => {
        const result = cyclicTypeSet.parse(
            { a: "a", b: "b" },
            {
                deepOnCycle: true,
                onCycle: {
                    cyclic: "cyclic?"
                }
            }
        )
        const cycleFromB = result.type.a.b.a.cyclic?.b.a.b.cyclic
        expectType<[false | undefined, true | undefined]>([
            cycleFromB?.isA,
            cycleFromB?.isB
        ])
    })
    test("with onResolve option", () => {
        const result = cyclicTypeSet.parse(
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
        const AWasResolved = result.type.referencesA.wasResolved
        expectType<true>(AWasResolved)
        const deepBWasResolved =
            result.type.referencesA.resolvedType.b.wasResolved
        expectType<true>(deepBWasResolved)
        // @ts-expect-error
        result.type.noReferences.wasResolved
    })
    test("parse result", () => {
        const parseResult = parse("a", {
            typeSet: { a: "true" }
        })
        expect(parseResult.definition).toBe("a")
        expect(parseResult.typeSet).toStrictEqual({ a: "true" })
        expect(parseResult.assert(true)).toBe(undefined)
        expect(parseResult.checkErrors(true)).toBe("")
        expect(parseResult.getDefault()).toBe(true)
        expect(parseResult.type).toBe(typeDefProxy)
    })
})
