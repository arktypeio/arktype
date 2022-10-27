import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../../../../api.js"
import { Operand } from "../../operand/operand.js"
import { Unenclosed } from "../../operand/unenclosed.js"

describe("intersection", () => {
    describe("parse", () => {
        test("two types", () => {
            const booleanAndTrue = type("boolean&true")
            attest(booleanAndTrue.ast).narrowedValue(["boolean", "&", "true"])
        })
        test("several types", () => {
            attest(type("unknown&boolean&false").ast).narrowedValue([
                ["unknown", "&", "boolean"],
                "&",
                "false"
            ])
        })
        describe("errors", () => {
            test("bad reference", () => {
                // @ts-expect-error
                attest(() => type("boolean&tru")).throwsAndHasTypeError(
                    Unenclosed.buildUnresolvableMessage("tru")
                )
            })
            test("double and", () => {
                // @ts-expect-error
                attest(() => type("boolean&&true")).throwsAndHasTypeError(
                    Operand.buildMissingRightOperandMessage("&", "&true")
                )
            })
        })
    })
})
