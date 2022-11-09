import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../../api.js"
import { buildMissingRightOperandMessage } from "../../../operand/operand.js"
import { buildUnresolvableMessage } from "../../../operand/unenclosed.js"

describe("union/parse", () => {
    test("two types", () => {
        attest(type("number|string").infer).typed as number | string
    })
    test("several types", () => {
        attest(type("false|null|undefined|0|''").infer).typed as
            | false
            | ""
            | 0
            | null
            | undefined
    })
    describe("errors", () => {
        test("bad reference", () => {
            // @ts-expect-error
            attest(() => type("number|strng")).throwsAndHasTypeError(
                buildUnresolvableMessage("strng")
            )
        })
        test("consecutive tokens", () => {
            // @ts-expect-error
            attest(() => type("boolean||null")).throwsAndHasTypeError(
                buildMissingRightOperandMessage("|", "|null")
            )
        })
        test("ends with |", () => {
            // @ts-expect-error
            attest(() => type("boolean|")).throwsAndHasTypeError(
                buildMissingRightOperandMessage("|", "")
            )
        })
        test("long missing union member", () => {
            attest(() =>
                // @ts-expect-error
                type("boolean[]|(string|number|)|object")
            ).throwsAndHasTypeError(
                buildMissingRightOperandMessage("|", ")|object")
            )
        })
    })
})
