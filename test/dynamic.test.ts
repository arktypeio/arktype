import { describe, it } from "mocha"
import { scope } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import { buildUnresolvableMessage } from "../src/parse/string/shift/operand/unenclosed.ts"
import { type } from "../src/type.ts"
import type { Dict } from "../src/utils/generics.ts"

describe("dynamic", () => {
    it("uninferred types", () => {
        const dynamicStringArray = type.dynamic("str" + "ing")
        attest(dynamicStringArray.infer).typed as unknown
        attest(dynamicStringArray.root).equals({ string: true })
    })
    it("uninferred aliases", () => {
        const s = scope.dynamic({
            a: "str" + "ing[" + "]",
            "b?": "a"
        })
        // Types are inferred as unknown
        attest(s.a.infer).typed as unknown
        // Doesn't allow bad references
        attest(() => {
            // @ts-expect-error
            type({ a: "nonexistent" }, { scope: s })
        }).throwsAndHasTypeError(buildUnresolvableMessage("nonexistent"))
    })
    it("uninferred scope", () => {
        const unknownScope = scope.dynamic({ a: "string" } as Dict)
        attest(unknownScope.a.infer).typed as unknown
        // Allows any references but will throw at runtime
        attest(() => unknownScope.b.infer).throws.snap(
            `TypeError: Cannot read properties of undefined (reading 'infer')`
        )
        attest(() => type("b", { scope: unknownScope })).throws(
            buildUnresolvableMessage("b")
        )
    })
})
