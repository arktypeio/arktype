import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../../api.js"
import { Operand } from "../../operand/operand.js"
import { Unenclosed } from "../../operand/unenclosed.js"

describe("union", () => {
    describe("infer", () => {
        test("two types", () => {
            attest(type("number|string").ast).narrowedValue([
                "number",
                "|",
                "string"
            ])
        })
        test("several types", () => {
            attest(type("false|null|undefined|0|''").ast).narrowedValue([
                [[["false", "|", "null"], "|", "undefined"], "|", 0],
                "|",
                "''"
            ])
        })
        describe("errors", () => {
            test("bad reference", () => {
                // @ts-expect-error
                attest(() => type("number|strng")).throwsAndHasTypeError(
                    Unenclosed.buildUnresolvableMessage("strng")
                )
            })
            test("consecutive tokens", () => {
                // @ts-expect-error
                attest(() => type("boolean||null")).throwsAndHasTypeError(
                    Operand.buildMissingRightOperandMessage("|", "|null")
                )
            })
            test("ends with |", () => {
                // @ts-expect-error
                attest(() => type("boolean|")).throwsAndHasTypeError(
                    Operand.buildMissingRightOperandMessage("|", "")
                )
            })
            test("long missing union member", () => {
                attest(() =>
                    // @ts-expect-error
                    type("boolean[]|(string|number|)|object")
                ).throwsAndHasTypeError(
                    Operand.buildMissingRightOperandMessage("|", ")|object")
                )
            })
        })
    })
})
