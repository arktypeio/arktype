import { declare, TypeSet } from ".."
import { expectType, expectError } from "tsd"
import { Evaluate } from "@re-do/utils"

describe("declare", () => {
    test("single", () => {
        const { define, compile } = declare("GottaDefineThis")
        const GottaDefineThis = define.GottaDefineThis("boolean")
        // @ts-expect-error
        expect(() => define.SomethingUndeclared("string")).toThrowError()
        // @ts-expect-error
        define.GottaDefineThis("whoops")
        const { types, parse } = compile(GottaDefineThis)
        expectType<boolean>(types.GottaDefineThis)
        const result = parse({ a: "GottaDefineThis" })
        expectType<{ a: boolean }>(result.type)
    })
    test("errors on compile with declared type undefined", () => {
        const { define, compile } = declare(
            "GottaDefineThis",
            "GottaDefineThisToo"
        )
        const GottaDefineThis = define.GottaDefineThis({
            a: "GottaDefineThisToo"
        })
        expectError<"Declared types 'GottaDefineThisToo' were never defined.">(
            // @ts-expect-error
            compile(GottaDefineThis)
        )
    })
    test("errors on compile with undeclared type defined", () => {
        const { define, compile } = declare("GottaDefineThis")
        const GottaDefineThis = define.GottaDefineThis("boolean")
        // @ts-expect-error
        compile(GottaDefineThis, {
            CantDefineThis: "boolean",
            WontDefineThis: "string"
        })
    })
    test("extends typeset", () => {
        let t: Evaluate<TypeSet<{ a: "b"; c: { a: "a" } }, "b">>
        expectType<{
            a: "b"
            c: {
                a: "a"
            }
        }>(t!)
        let broken: Evaluate<TypeSet<{ a: "b" }, "c" | "d">>
        expectType<{
            a: "Unable to determine the type of 'b'."
        }>(broken!)
    })
})
