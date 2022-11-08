import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { space } from "../../space.js"
import { type } from "../../type.js"
import type { dictionary } from "../../utils/dynamicTypes.js"
import { Unenclosed } from "../operand/unenclosed.js"

describe("dynamic", () => {
    test("uninferred types", () => {
        const dynamicStringArray = type.dynamic("str" + "ing[" + "]")
        attest(dynamicStringArray.infer).typed as unknown
        attest(dynamicStringArray.attributes).equals({
            type: "array",
            props: {
                "*": { type: "string" }
            }
        })
    })
    test("uninferred aliases", () => {
        const s = space.dynamic({
            a: "str" + "ing[" + "]",
            "b?": "a"
        })
        // Types are inferred as unknown
        attest(s.a.infer).typed as unknown
        // Doesn't allow bad references
        attest(() => {
            // @ts-expect-error
            type({ a: "st" }, { space: s })
        }).throwsAndHasTypeError(Unenclosed.buildUnresolvableMessage("st"))
    })
    test("uninferred space", () => {
        const unknownSpace = space.dynamic({ a: "string" } as dictionary)
        attest(unknownSpace.a.infer).typed as unknown
        // Allows any references but will throw at runtime
        attest(() => unknownSpace.b.infer).throws.snap(
            `TypeError: Cannot read properties of undefined (reading 'infer')`
        )
        attest(() => type("b", { space: unknownSpace })).throws(
            Unenclosed.buildUnresolvableMessage("b")
        )
    })
})
