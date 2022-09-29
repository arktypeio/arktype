import { assert } from "@re-/assert"
import { describe, test } from "mocha"
import { type } from "../../../../api.js"
import { unresolvableMessage } from "../../operand/unenclosed.js"
import { expressionExpectedMessage } from "../../state/state.js"

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
                assert(() => type("number|sting")).throwsAndHasTypeError(
                    unresolvableMessage("sting")
                )
            })
            test("double pipes", () => {
                // @ts-expect-error
                assert(() => type("boolean||null")).throwsAndHasTypeError(
                    expressionExpectedMessage("|null")
                )
            })
            test("ends with |", () => {
                // @ts-expect-error
                assert(() => type("boolean|")).throwsAndHasTypeError(
                    expressionExpectedMessage("")
                )
            })
            test("long missing union member", () => {
                assert(() =>
                    // @ts-expect-error
                    type("boolean[]|(string|number|)|object")
                ).throwsAndHasTypeError(expressionExpectedMessage(")|object"))
            })
        })
    })
})
