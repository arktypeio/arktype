import { declare } from ".."
import { expectType, expectError } from "tsd"

describe("declare", () => {
    test("single", () => {
        const { define, compile } = declare("GottaDefineThis")
        const GottaDefineThis = define.GottaDefineThis("boolean")
        // @ts-expect-error
        expect(() => define.SomethingUndeclared("string")).toThrowError()
        // @ts-expect-error
        define.GottaDefineThis("whoops")
        const { types, parse } = compile(GottaDefineThis)
        expectType<boolean>(types.GottaDefineThis.type)
        const result = parse({ a: "GottaDefineThis" })
        expectType<{ a: boolean }>(result.type)
    })
    test("errors on compile with declared type undefined", () => {
        const { define, compile } = declare(
            "GottaDefineThis",
            "GottaDefineThisToo"
        )
        const GottaDefineThis = define.GottaDefineThis({
            a: "string"
        })
        // @ts-expect-error
        compile(GottaDefineThis)
    })
    test("errors on compile with undeclared type defined", () => {
        const { define, compile } = declare("GottaDefineThis")
        const GottaDefineThis = define.GottaDefineThis("boolean")
        compile(GottaDefineThis, {
            // @ts-expect-error
            CantDefineThis: "boolean",
            // @ts-expect-error
            WontDefineThis: "string"
        })
    })
})
