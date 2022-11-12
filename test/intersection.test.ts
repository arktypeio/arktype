import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../api.js"
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
