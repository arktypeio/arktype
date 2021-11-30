import { compile, parse } from ".."
import { expectType, expectError, printType } from "tsd"
import { typeDefProxy } from "../common.js"
import { check } from "@re-do/assert"

describe("compile", () => {
    test("single", () => {
        const typeOfA = compile({ a: "string" }).types.a.type
        expect(check(typeOfA).type()).toBe("string")
        const { type, value } = check(() => compile({ a: "strig" })).both
        expect(value.throws()).toStrictEqual(
            "Error: Unable to determine the type of 'strig'."
        )
        expect(type.errors()).toStrictEqual([
            `Type '"strig"' is not assignable to type '"Unable to determine the type of 'strig'."'.`
        ])
    })
    test("independent", () => {
        const typeOfB = compile({ a: "string" }, { b: { c: "boolean" } }).types
            .b.type
        expect(check(typeOfB).type()).toMatchInlineSnapshot()
        const { type, value } = check(() =>
            compile({ a: "string" }, { b: { c: "uhoh" } })
        ).both
        toThrowErrorMatchingInlineSnapshot(
            `"Unable to determine the type of 'uhoh' at path c."`
        )
        // expectError<"Unable to determine the type of 'uhoh'.">(badC)
    })
    test("interdependent", () => {
        const c = compile({ a: "string" }, { b: { c: "a" } }).types.b.type.c
        expectType<string>(c)
        expect(() =>
            // @ts-expect-error
            compile({ a: "uhoh" }, { b: { c: "a" } })
        ).toThrowErrorMatchingInlineSnapshot(
            `"Unable to determine the type of 'uhoh'."`
        )
        // expectError<"Unable to determine the type of 'uhoh'.">(badC)
    })
    test("recursive", () => {
        const { types } = compile({ a: { dejaVu: "a?" } })
        expectType<{ dejaVu?: any } | undefined>(
            types.a.type.dejaVu?.dejaVu?.dejaVu
        )
    })
    test("cyclic", () => {
        const { types } = compile({ a: { b: "b" } }, { b: { a: "a" } })
        // Type hint displays as any on hitting cycle
        expectType<{ b: any }>(types.a.type)
        // But still yields correct types when properties are accessed
        expectType<{ b: any }>(types.b.type.a.b.a)
        // And errors on nonexisting props
        // @ts-expect-error
        types.a.type.b.a.b.c
    })
    test("object list", () => {
        const b = compile({ a: "string" }, { b: [{ c: "a" }] }).types.b.type
        expectType<{ c: string }[]>(b)
        // Can't pass in object list directly to compile
        // @ts-expect-error
        expect(() => compile([{ b: { c: "string" } }]))
            .toThrowErrorMatchingInlineSnapshot(`
            "Compile args must be a list of names mapped to their corresponding definitions
                        passed as rest args, e.g.:
                        compile(
                            { user: { name: \\"string\\" } },
                            { group: \\"user[]\\" }
                        )"
        `)
    })
    test("can parse from compiled types", () => {
        const { parse } = compile({ a: { b: "b" } }, { b: { a: "a" } })
        const result = parse("a|b|null").type
        expectType<{ b: { a: any } } | { a: { b: any } } | null>(result)
        expect(() =>
            // @ts-expect-error
            parse({ nested: { a: "a", b: "b", c: "c" } })
        ).toThrowErrorMatchingInlineSnapshot(
            `"Unable to determine the type of 'c' at path nested/c."`
        )
        // expectError<{
        //     nested: {
        //         a: {
        //             b: {
        //                 a: any
        //             }
        //         }
        //         b: {
        //             a: any
        //         }
        //         c: "Unable to determine the type of 'c'."
        //     }
        // }>(badResult)
    })
    test("compile result", () => {
        const compileResult = compile({ a: { b: "b?" } }, { b: { a: "a?" } })
        const { type, ...parseResult } = compileResult.parse("a") as any
        expect(type).toBe(typeDefProxy)
        expect(parseResult).toMatchInlineSnapshot(`
            {
              "allows": [Function],
              "assert": [Function],
              "check": [Function],
              "definition": "a",
              "generate": [Function],
              "references": [Function],
              "typeSet": {
                "a": {
                  "b": "b?",
                },
                "b": {
                  "a": "a?",
                },
              },
            }
        `)
        const { type: preparsedType, ...preparsedResult } = compileResult.types
            .a as any
        expect(preparsedType).toBe(typeDefProxy)
        expect(preparsedResult).toMatchInlineSnapshot(`
            {
              "allows": [Function],
              "assert": [Function],
              "check": [Function],
              "definition": {
                "b": "b?",
              },
              "generate": [Function],
              "references": [Function],
              "typeSet": {
                "a": {
                  "b": "b?",
                },
                "b": {
                  "a": "a?",
                },
              },
            }
        `)
        // Make sure b is included in types without rechecking all of the above
        expect(typeof compileResult.types.b).toBe("object")
    })
})
