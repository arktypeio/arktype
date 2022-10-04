import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../api.js"
import { Unenclosed } from "../../operand/unenclosed.js"
import { scanner } from "../../state/scanner.js"

describe("union", () => {
    describe("infer", () => {
        test("two types", () => {
            assert(type("number|string").ast).narrowedValue([
                "number",
                "|",
                "string"
            ])
        })
        test("several types", () => {
            assert(type("false|null|undefined|0|''").ast).narrowedValue([
                [[["false", "|", "null"], "|", "undefined"], "|", "0"],
                "|",
                "''"
            ])
        })
        describe("errors", () => {
            test("bad reference", () => {
                // @ts-expect-error
                assert(() => type("number|strng")).throwsAndHasTypeError(
                    Unenclosed.buildUnresolvableMessage("strng")
                )
            })
            test("double pipes", () => {
                // @ts-expect-error
                assert(() => type("boolean||null")).throwsAndHasTypeError(
                    scanner.buildExpressionExpectedMessage("|null")
                )
            })
            test("ends with |", () => {
                // @ts-expect-error
                assert(() => type("boolean|")).throwsAndHasTypeError(
                    scanner.buildExpressionExpectedMessage("")
                )
            })
            test("long missing union member", () => {
                assert(() =>
                    // @ts-expect-error
                    type("boolean[]|(string|number|)|object")
                ).throwsAndHasTypeError(
                    scanner.buildExpressionExpectedMessage(")|object")
                )
            })
        })
    })
})
