import { compile } from ".."
import { expectType, expectError } from "tsd"

describe("compile", () => {
    test("single", () => {
        expectType<string>(compile({ a: "string" }).types.a)
        expectError<"Unable to parse the type of 'strig'.">(
            // @ts-expect-error
            compile({ a: "strig" }).types.a
        )
    })
    test("independent", () => {
        expectType<boolean>(
            compile({ a: "string" }, { b: { c: "boolean" } }).types.b.c
        )
        expectError<"Unable to parse the type of 'uhoh'.">(
            // @ts-expect-error
            compile({ a: "string" }, { b: { c: "uhoh" } }).types.b.c
        )
    })
    test("interdependent", () => {
        expectType<string>(
            compile({ a: "string" }, { b: { c: "a" } }).types.b.c
        )
        expectError<"Unable to parse the type of 'uhoh'.">(
            // @ts-expect-error
            compile({ a: "uhoh" }, { b: { c: "a" } }).types.b.c
        )
    })
    test("recursive", () => {
        const { types } = compile({ a: { dejaVu: "a?" } })
        expectType<{ dejaVu?: any } | undefined>(types.a.dejaVu?.dejaVu?.dejaVu)
    })
    test("cyclic", () => {
        const { types } = compile({ a: { b: "b" } }, { b: { a: "a" } })
        // Type hint displays as any on hitting cycle
        expectType<{ b: any }>(types.a)
        // But still yields correct types when properties are accessed
        expectType<{ b: any }>(types.b.a.b.a)
        // And errors on nonexisting props
        // @ts-expect-error
        types.a.b.a.b.c
    })
    test("object list", () => {
        expectType<{ c: string }[]>(
            compile({ a: "string" }, { b: [{ c: "a" }] }).types.b
        )
        // Can't pass in object list directly to compile
        // @ts-expect-error
        const result = compile([{ b: { c: "string" } }]).types
    })
    test("can parse from compiled types", () => {
        const { parse } = compile({ a: { b: "b" } }, { b: { a: "a" } })
        expectType<{ b: { a: any } } | { a: { b: any } } | null>(
            parse("a|b|null")
        )
        // @ts-expect-error
        const result = parse({ nested: { a: "a", b: "b", c: "c" } })
        expectError<{
            nested: {
                a: {
                    b: {
                        a: any
                    }
                }
                b: {
                    a: any
                }
                c: "Unable to parse the type of 'c'."
            }
        }>(result)
    })
})
