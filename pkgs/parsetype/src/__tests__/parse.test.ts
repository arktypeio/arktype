import { parse } from ".."
import { InvalidTypeDefError } from "../validate"
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
})
