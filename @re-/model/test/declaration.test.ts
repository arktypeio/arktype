import { assert } from "@re-/assert"
import { declare } from "../src/index.js"

describe("declare", () => {
    it("single", () => {
        const { define, compile } = declare("gottaDefineThis")
        const gottaDefineThis = define.gottaDefineThis("boolean")
        assert(() =>
            // @ts-expect-error
            define.somethingUndeclared("string")
        ).throwsAndHasTypeError("somethingUndeclared")
        // @ts-expect-error
        assert(() => define.gottaDefineThis("whoops")).throwsAndHasTypeError(
            "Unable to determine the type of 'whoops'"
        )
        const space = compile(gottaDefineThis)
        assert(space.create({ a: "gottaDefineThis" }).type).typed as {
            a: boolean
        }
    })
    it("errors on compile with declared type undefined", () => {
        const { define, compile } = declare(
            "gottaDefineThis",
            "gottaDefineThisToo"
        )
        const gottaDefineThis = define.gottaDefineThis({
            a: "string"
        })
        // @ts-expect-error
        assert(() => compile(gottaDefineThis))
            .throws("Declared types 'gottaDefineThisToo' were never defined.")
            .type.errors("Property 'gottaDefineThisToo' is missing")
    })
    it("errors on compile with undeclared type defined", () => {
        const { define, compile } = declare("gottaDefineThis")
        const gottaDefineThis = define.gottaDefineThis("boolean")
        assert(() =>
            compile({
                ...gottaDefineThis,
                // @ts-expect-error
                cantDefineThis: "boolean",
                // @ts-expect-error
                wontDefineThis: "string"
            })
        ).throws(
            "Defined types 'cantDefineThis', 'wontDefineThis' were never declared."
        ).type.errors
            .snap(`Type '"boolean"' is not assignable to type '"Invalid property 'cantDefineThis'. Valid properties are: gottaDefineThis"'.
Type '"string"' is not assignable to type '"Invalid property 'wontDefineThis'. Valid properties are: gottaDefineThis"'.`)
    })
})
