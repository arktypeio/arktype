import { describe, it } from "mocha"
import { type } from "../../src/main.js"
import {
    writeMissingRightOperandMessage,
    writeUnresolvableMessage
} from "../../src/parse/string/shift/operand/unenclosed.js"
import { attest } from "../attest/main.js"

describe("tuple expression", () => {
    it("nested", () => {
        const t = type(["string|bigint", "|", ["number", "|", "boolean"]])
        attest(t.infer).typed as string | number | bigint | boolean
    })
    describe("errors", () => {
        it("missing right operand", () => {
            // @ts-expect-error
            attest(() => type(["string", "|"])).throwsAndHasTypeError(
                writeMissingRightOperandMessage("|", "")
            )
            // @ts-expect-error
            attest(() => type(["string", "&"])).throwsAndHasTypeError(
                writeMissingRightOperandMessage("&", "")
            )
        })
        it("nested parse error", () => {
            attest(() => {
                // @ts-expect-error
                type(["string", "|", "numbr"])
            }).throwsAndHasTypeError(writeUnresolvableMessage("numbr"))
        })
        it("nested object parse error", () => {
            attest(() => {
                // @ts-expect-error
                type([{ s: "strng" }, "|", "number"])
            }).throwsAndHasTypeError(writeUnresolvableMessage("strng"))
        })
    })
})
