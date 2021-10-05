import { compile } from ".."
import { expectType, expectError } from "tsd"

describe("compile", () => {
    test("single", () => {
        const a = compile({ a: "string" }).types.a
        expectType<string>(a)
        // @ts-expect-error
        const badA = compile({ a: "strig" }).types.a
        expectError<"Unable to determine the type of 'strig'.">(badA)
    })
    test("independent", () => {
        const c = compile({ a: "string" }, { b: { c: "boolean" } }).types.b.c
        expectType<boolean>(c)
        // @ts-expect-error
        const badC = compile({ a: "string" }, { b: { c: "uhoh" } }).types.b.c
        expectError<"Unable to determine the type of 'uhoh'.">(badC)
    })
    test("interdependent", () => {
        const c = compile({ a: "string" }, { b: { c: "a" } }).types.b.c
        expectType<string>(c)
        // @ts-expect-error
        const badC = compile({ a: "uhoh" }, { b: { c: "a" } }).types.b.c
        expectError<"Unable to determine the type of 'uhoh'.">(badC)
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
        const b = compile({ a: "string" }, { b: [{ c: "a" }] }).types.b
        expectType<{ c: string }[]>(b)
        // Can't pass in object list directly to compile
        // @ts-expect-error
        const badResult = compile([{ b: { c: "string" } }]).types
    })
    test("can parse from compiled types", () => {
        const { parse } = compile({ a: { b: "b" } }, { b: { a: "a" } })
        const result = parse("a|b|null").type
        expectType<{ b: { a: any } } | { a: { b: any } } | null>(result)
        // @ts-expect-error
        const badResult = parse({ nested: { a: "a", b: "b", c: "c" } }).type
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
                c: "Unable to determine the type of 'c'."
            }
        }>(badResult)
    })
})
