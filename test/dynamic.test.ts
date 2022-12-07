import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { buildUnresolvableMessage } from "../src/parse/shift/operand/unenclosed.js"
import { scope } from "../src/scope.js"
import { type } from "../src/type.js"
import type { Dictionary } from "../src/utils/generics.js"

describe("dynamic", () => {
    test("uninferred types", () => {
        const dynamicStringArray = type.dynamic("str" + "ing")
        attest(dynamicStringArray.infer).typed as unknown
        attest(dynamicStringArray.root).equals("string")
    })
    test("uninferred aliases", () => {
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
    test("uninferred scope", () => {
        const unknownScope = scope.dynamic({ a: "string" } as Dictionary)
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
