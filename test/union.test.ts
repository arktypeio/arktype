import { attest } from "@arktype/test"
import { describe, test } from "mocha"
import { type } from "../api.js"
import {
    buildMissingRightOperandMessage,
    buildUnresolvableMessage
} from "../src/errors.js"

describe("union/parse", () => {
    test("binary", () => {
        const binary = type("number|string")
        attest(binary.infer).typed as number | string
        attest(binary.attributes).snap({
            branches: ["?", "", "type", { number: {}, string: {} }]
        })
    })
    test("nary", () => {
        const nary = type("false|null|undefined|0|''")
        attest(nary.infer).typed as false | "" | 0 | null | undefined
        attest(nary.attributes).snap({
            branches: [
                "?",
                "",
                "value",
                {
                    "0": {},
                    false: { type: "boolean" },
                    null: { type: "null" },
                    undefined: { type: "undefined" },
                    "''": {}
                }
            ]
        })
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
