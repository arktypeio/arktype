import { assert } from "@re-do/assert"
import { declare } from ".."

describe("declare", () => {
    test("single", () => {
        const { define, compile } = declare("GottaDefineThis")
        const GottaDefineThis = define.GottaDefineThis("boolean")
        assert(() =>
            // @ts-expect-error
            define.SomethingUndeclared("string")
        ).throwsAndHasTypeError("SomethingUndeclared")
        // @ts-expect-error
        assert(() => define.GottaDefineThis("whoops")).throwsAndHasTypeError(
            "Unable to determine the type of 'whoops'"
        )
        const { parse } = compile(GottaDefineThis)
        assert(parse({ a: "GottaDefineThis" }).type).typed as {
            a: boolean
        }
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
        assert(() => compile(GottaDefineThis)).throwsAndHasTypeError(
            "Declared types 'GottaDefineThisToo' were never defined."
        )
    })
    test("errors on compile with undeclared type defined", () => {
        const { define, compile } = declare("GottaDefineThis")
        const GottaDefineThis = define.GottaDefineThis("boolean")
        assert(() =>
            compile(GottaDefineThis, {
                // @ts-expect-error
                CantDefineThis: "boolean",
                // @ts-expect-error
                WontDefineThis: "string"
            })
        )
            .throws(
                "Defined types 'CantDefineThis', 'WontDefineThis' were never declared."
            )
            .type.errors(
                /"CantDefineThis was never declared\."[\s\S]*"WontDefineThis was never declared\."/
            )
    })
})
