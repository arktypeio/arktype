import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"
import {
    buildMissingRightOperandMessage,
    buildUnresolvableMessage
} from "../src/parse/shift/operand/unenclosed.js"

describe("intersection", () => {
    describe("parse", () => {
        test("two types", () => {
            attest(type("boolean&true").infer).typed as true
        })
        test("several types", () => {
            attest(type("unknown&boolean&false").infer).typed as false
        })
        describe("errors", () => {
            test("bad reference", () => {
                // @ts-expect-error
                attest(() => type("boolean&tru")).throwsAndHasTypeError(
                    buildUnresolvableMessage("tru")
                )
            })
            test("double and", () => {
                // @ts-expect-error
                attest(() => type("boolean&&true")).throwsAndHasTypeError(
                    buildMissingRightOperandMessage("&", "&true")
                )
            })
        })
    })
})
