import { suite, test } from "mocha"
import { type } from "../../src/main.js"
import { writeBadDefinitionTypeMessage } from "../../src/parse/definition.js"
import { attest } from "../attest/main.js"

suite("definitions", () => {
    test("undefined", () => {
        // @ts-expect-error
        attest(() => type({ bad: undefined })).throwsAndHasTypeError(
            writeBadDefinitionTypeMessage("undefined")
        )
    })
    test("null", () => {
        // @ts-expect-error
        attest(() => type({ bad: null })).throwsAndHasTypeError(
            writeBadDefinitionTypeMessage("null")
        )
    })
    test("boolean", () => {
        // @ts-expect-error
        attest(() => type({ bad: true })).throwsAndHasTypeError(
            writeBadDefinitionTypeMessage("boolean")
        )
    })
    test("number", () => {
        // @ts-expect-error
        attest(() => type({ bad: 5 })).throwsAndHasTypeError(
            writeBadDefinitionTypeMessage("number")
        )
    })
    test("bigint", () => {
        // @ts-expect-error
        attest(() => type({ bad: 99999n })).throwsAndHasTypeError(
            writeBadDefinitionTypeMessage("bigint")
        )
    })
    test("symbol", () => {
        // @ts-expect-error
        attest(() => type({ bad: Symbol() })).throwsAndHasTypeError(
            writeBadDefinitionTypeMessage("symbol")
        )
    })
})
