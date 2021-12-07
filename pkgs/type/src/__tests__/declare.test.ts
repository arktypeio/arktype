import { declare } from ".."
import { expectType, expectError } from "tsd"
import { assert } from "@re-do/assert"

describe("declare", () => {
    test("single", () => {
        const { define, compile } = declare("GottaDefineThis")
        const GottaDefineThis = define.GottaDefineThis("boolean")
        assert(() =>
            define.SomethingUndeclared("string")
        ).throwsAndHasTypeError("SomethingUndeclared")
        assert(() => define.GottaDefineThis("whoops")).throwsAndHasTypeError(
            "Unable to determine the type of 'whoops'"
        )
        const { types, parse } = compile(GottaDefineThis)
        assert(parse({ a: "GottaDefineThis" })).typed as {
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
