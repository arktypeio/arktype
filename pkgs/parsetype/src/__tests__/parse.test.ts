import { parse } from ".."
import { InvalidTypeDefError } from "../definitions"
import { expectType, expectError } from "tsd"

describe("parse", () => {
    test("built-in", () => {
        expectType<string>(parse("string"))
        // @ts-expect-error
        expectError<"Unable to parse the type of 'strig'.">(parse("strig"))
    })
    test("string", () => {
        expectType<(string | number)[] | undefined>(parse("string|number[]?"))
        expectError<"Unable to parse the type of '[]number'.">(
            // @ts-expect-error
            parse("string|[]number")
        )
    })
    test("string tuple", () => {})
    test("string function", () => {
        const result = parse("(string, number) => boolean[]")
        expectType<(x: string, y: number) => boolean[]>(result)
        expectType<() => void>(parse("()=>void"))
        // @ts-expect-error
        parse("()=>")
        // @ts-expect-error
        const badParameterResult = parse("(foop, string, nufmber) => boolean[]")
        expectError<
            (
                args_0: "Unable to parse the type of 'foop'.",
                args_1: string,
                args_2: "Unable to parse the type of 'nufmber'."
            ) => boolean[]
        >(badParameterResult)
        // @ts-expect-error
        const badReturnResult = parse("()=>fork")
        expectError<() => "Unable to parse the type of 'fork'.">(
            badReturnResult
        )
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
        }>(result)
        // @ts-expect-error
        const badResult = parse({ a: { b: "whoops" } })
        expectError<{
            a: {
                b: "Unable to parse the type of 'whoops'."
            }
        }>(badResult)
    })
    test("bad type def type", () => {
        // @ts-expect-error
        const result = parse({ bad: true })
        expectError<{ bad: InvalidTypeDefError }>(result)
    })
    test("with typeset", () => {
        expectType<boolean>(parse("borf", { borf: "boolean" }))
        const result = parse({ snorf: "borf[]" }, { borf: "boolean" })
        expectType<{ snorf: boolean[] }>(result)
    })
    test("object definition list", () => {
        const result = parse([{ a: "boolean" }])
        expectType<{ a: boolean }[]>(result)
    })
    test("whitespace is ignored when parsing strings", () => {
        expectType<boolean | null>(parse("    boolean      |    null       "))
        const result = parse({ nested: "number|    true" })
        expectType<{ nested: number | true }>(result)
    })
})
