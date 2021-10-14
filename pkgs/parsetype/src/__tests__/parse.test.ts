import { parse, TypeDefinition } from ".."
import { expectType, expectError } from "tsd"
import { DefinitionTypeError } from "../errors.js"

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
    test("string function", () => {
        const result = parse("(string, number) => boolean[]")
        expectType<(x: string, y: number) => boolean[]>(result.type)
        const emptyFunction = parse("()=>void").type
        expectType<() => void>(emptyFunction)
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
            c: { nested: "null[]" }
        })
        expectType<{
            a: string
            b?: true | number | undefined
            c: { nested: null[] }
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
            `"Definition value true at path bad is invalid. Definitions must be strings or objects."`
        )
    })
    test("with typeset", () => {
        const stringResult = parse("borf", { borf: "boolean" }).type
        expectType<boolean>(stringResult)
        const objectResult = parse({ snorf: "borf[]" }, { borf: "boolean" })
        expectType<{ snorf: boolean[] }>(objectResult.type)
    })
    test("list definition", () => {
        const result = parse([{ a: "boolean" }, { b: "string?" }])
        expectType<[{ a: boolean }, { b?: string }]>(result.type)
    })
    test("whitespace is ignored when parsing strings", () => {
        const stringResult = parse("    boolean      |    null       ").type
        expectType<boolean | null>(stringResult)
        const objectResult = parse({ nested: "number|    true" })
        expectType<{ nested: number | true }>(objectResult.type)
    })
    test("extract base names of string", () => {
        let t: TypeDefinition<
            "(user[],group[])=>boolean|number|null",
            ["user", "group"],
            { extractBaseNames: true }
        >
        expectType<"number" | "boolean" | "user" | "group" | "null">(t!)
    })
    test("extract base names of object", () => {
        let t: TypeDefinition<
            {
                a: { b: { c: "user[]?" } }
                listed: [
                    "group|null",
                    "user|null",
                    "(string, number)=>function"
                ]
            },
            ["user", "group"],
            { extractBaseNames: true }
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
        }>(t!)
    })
})
