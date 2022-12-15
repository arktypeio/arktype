import { describe, test } from "mocha"
import { attest } from "../dev/attest/exports.js"
import { type } from "../exports.js"
import { buildBadDefinitionTypeMessage } from "../src/parse/definition.js"

describe("bad definition types", () => {
    test("any", () => {
        // Can't create an assignment error if type is any, so we have to rely
        // on the return type being never
        // @ts-expect-error The type error is from attest
        attest(type({} as any)).typed as never
    })
    test("unknown", () => {
        // @ts-expect-error
        attest(type({} as unknown)).type.errors(
            "Cannot statically parse a definition inferred as unknown. Use 'type.dynamic(...)' instead."
        )
    })
    test("undefined", () => {
        // @ts-expect-error
        attest(() => type({ bad: undefined })).throwsAndHasTypeError(
            buildBadDefinitionTypeMessage("undefined")
        )
    })
    test("null", () => {
        // @ts-expect-error
        attest(() => type({ bad: null })).throwsAndHasTypeError(
            buildBadDefinitionTypeMessage("null")
        )
    })
    test("boolean", () => {
        // @ts-expect-error
        attest(() => type({ bad: true })).throwsAndHasTypeError(
            buildBadDefinitionTypeMessage("boolean")
        )
    })
    test("number", () => {
        // @ts-expect-error
        attest(() => type({ bad: 5 })).throwsAndHasTypeError(
            buildBadDefinitionTypeMessage("number")
        )
    })
    test("bigint", () => {
        // @ts-expect-error
        attest(() => type({ bad: 99999n })).throwsAndHasTypeError(
            buildBadDefinitionTypeMessage("bigint")
        )
    })
    test("symbol", () => {
        // @ts-expect-error
        attest(() => type({ bad: Symbol() })).throwsAndHasTypeError(
            buildBadDefinitionTypeMessage("symbol")
        )
    })
    test("objects", () => {
        // @ts-expect-error
        attest(() => type({ bad: () => {} })).throwsAndHasTypeError(
            buildBadDefinitionTypeMessage("Function")
        )
    })
})
