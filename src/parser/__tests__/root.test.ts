import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { space, type } from "../../api.js"
import type { dictionary } from "../../internal.js"
import { Root } from "../root.js"
import { Unenclosed } from "../string/operand/unenclosed.js"

describe("root definition", () => {
    // TODO: Add lazy tests
    describe("dynamic", () => {
        test("uninferred types", () => {
            const dynamicStringArray = type.dynamic("str" + "ing[" + "]")
            attest(dynamicStringArray.infer).typed as unknown
            attest(dynamicStringArray.root).equals({
                type: "array",
                baseProp: { type: "string" }
            })
        })
        test("uninferred aliases", () => {
            const s = space.dynamic({
                a: "str" + "ing[" + "]",
                b: "a?"
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
    describe("bad def types", () => {
        test("undefined", () => {
            // @ts-expect-error
            attest(() => type({ bad: undefined })).throwsAndHasTypeError(
                Root.buildBadDefinitionTypeMessage("undefined")
            )
        })
        test("null", () => {
            // @ts-expect-error
            attest(() => type({ bad: null })).throwsAndHasTypeError(
                Root.buildBadDefinitionTypeMessage("null")
            )
        })
        test("boolean", () => {
            // @ts-expect-error
            attest(() => type({ bad: true })).throwsAndHasTypeError(
                Root.buildBadDefinitionTypeMessage("boolean")
            )
        })
        test("number", () => {
            // @ts-expect-error
            attest(() => type({ bad: 5 })).throwsAndHasTypeError(
                Root.buildBadDefinitionTypeMessage("number")
            )
        })
        test("bigint", () => {
            // @ts-expect-error
            attest(() => type({ bad: 99999n })).throwsAndHasTypeError(
                Root.buildBadDefinitionTypeMessage("bigint")
            )
        })
        test("function", () => {
            // @ts-expect-error
            attest(() => type({ bad: () => {} })).throwsAndHasTypeError(
                Root.buildBadDefinitionTypeMessage("function")
            )
        })
        test("symbol", () => {
            // @ts-expect-error
            attest(() => type({ bad: Symbol() })).throwsAndHasTypeError(
                Root.buildBadDefinitionTypeMessage("symbol")
            )
        })
    })
    // TODO: Re-enable
    // test("doesn't try to validate any as a model definition", () => {
    //     attest(type({} as any).infer).typed as any
    // })
})
