import { describe, test } from "mocha"
import { space, type } from "../../api.js"
import type { Dictionary } from "../../utils/generics.js"
import { Root } from "../root.js"
import { Unenclosed } from "../str/operand/unenclosed.js"
import { assert } from "#testing"

describe("root definition", () => {
    // TODO: Add lazy tests
    describe("dynamic", () => {
        test("uninferred types", () => {
            const dynamicStringArray = type.dynamic("str" + "ing[" + "]")
            assert(dynamicStringArray.infer).typed as unknown
            assert(dynamicStringArray.ast).equals(["string", "[]"])
        })
        test("uninferred aliases", () => {
            const s = space.dynamic({
                a: "str" + "ing[" + "]",
                b: "a?"
            })
            // Types are inferred as unknown
            assert(s.a.infer).typed as unknown
            // Doesn't allow bad references
            assert(() => {
                // @ts-expect-error
                type({ a: "st" }, { space: s })
            }).throwsAndHasTypeError(Unenclosed.buildUnresolvableMessage("st"))
        })
        test("uninferred space", () => {
            const unknownSpace = space.dynamic({ a: "string" } as Dictionary)
            assert(unknownSpace.a.infer).typed as unknown
            // Allows any references but will throw at runtime
            assert(() => unknownSpace.b.infer).throws.snap(
                `TypeError: Cannot read properties of undefined (reading 'infer')`
            )
            assert(() => type("b", { space: unknownSpace })).throws(
                Unenclosed.buildUnresolvableMessage("b")
            )
        })
    })
    describe("bad def types", () => {
        test("undefined", () => {
            // @ts-expect-error
            assert(() => type({ bad: undefined })).throwsAndHasTypeError(
                Root.buildBadDefinitionTypeMessage("undefined")
            )
        })
        test("null", () => {
            // @ts-expect-error
            assert(() => type({ bad: null })).throwsAndHasTypeError(
                Root.buildBadDefinitionTypeMessage("null")
            )
        })
        test("boolean", () => {
            // @ts-expect-error
            assert(() => type({ bad: true })).throwsAndHasTypeError(
                Root.buildBadDefinitionTypeMessage("boolean")
            )
        })
        test("number", () => {
            // @ts-expect-error
            assert(() => type({ bad: 5 })).throwsAndHasTypeError(
                Root.buildBadDefinitionTypeMessage("number")
            )
        })
        test("bigint", () => {
            // @ts-expect-error
            assert(() => type({ bad: 99999n })).throwsAndHasTypeError(
                Root.buildBadDefinitionTypeMessage("bigint")
            )
        })
        test("function", () => {
            // @ts-expect-error
            assert(() => type({ bad: () => {} })).throwsAndHasTypeError(
                Root.buildBadDefinitionTypeMessage("function")
            )
        })
        test("symbol", () => {
            // @ts-expect-error
            assert(() => type({ bad: Symbol() })).throwsAndHasTypeError(
                Root.buildBadDefinitionTypeMessage("symbol")
            )
        })
    })
    // TODO: Re-enable
    // test("doesn't try to validate any as a model definition", () => {
    //     assert(type({} as any).infer).typed as any
    // })
})
