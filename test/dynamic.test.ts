import { describe, it } from "mocha"
import { scope, type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import { writeUnresolvableMessage } from "../src/parse/string/shift/operand/unenclosed.ts"
import type { Dict } from "../src/utils/generics.ts"

describe("dynamic", () => {
    it("uninferred types", () => {
        const dynamicStringArray = type.dynamic("str" + "ing")
        attest(dynamicStringArray.infer).typed as unknown
        attest(dynamicStringArray.node).equals({ string: true })
    })
    it("uninferred aliases", () => {
        const types = scope
            .dynamic({
                a: "str" + "ing[" + "]",
                "b?": "a"
            })
            .compile()
        // Types are inferred as unknown
        attest(types.a.infer).typed as unknown
        // Doesn't allow bad references
        attest(() => {
            // @ts-expect-error
            type({ a: "nonexistent" }, { scope: types })
        }).throwsAndHasTypeError(writeUnresolvableMessage("nonexistent"))
    })
    it("uninferred scope", () => {
        const $ = scope.dynamic({ a: "string" } as Dict)
        const types = $.compile()
        attest(types.a.infer).typed as unknown
        // Allows any references but will throw at runtime
        attest(() => types.b.infer).throws.snap(
            `TypeError: Cannot read properties of undefined (reading 'infer')`
        )
        attest(() => $.type("b")).throws(writeUnresolvableMessage("b"))
    })
})
