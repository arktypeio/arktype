import { describe, it } from "mocha"
import { type } from "../../src/main.ts"
import {
    unknownDefinitionMessage,
    writeBadDefinitionTypeMessage
} from "../../src/parse/definition.ts"
import { attest } from "arktype-attest"

describe("bad definition types", () => {
    it("unknown", () => {
        // @ts-expect-error
        attest(type({} as unknown)).type.errors(unknownDefinitionMessage)
    })
    it("undefined", () => {
        // @ts-expect-error
        attest(() => type({ bad: undefined })).throwsAndHasTypeError(
            writeBadDefinitionTypeMessage("undefined")
        )
    })
    it("null", () => {
        // @ts-expect-error
        attest(() => type({ bad: null })).throwsAndHasTypeError(
            writeBadDefinitionTypeMessage("null")
        )
    })
    it("boolean", () => {
        // @ts-expect-error
        attest(() => type({ bad: true })).throwsAndHasTypeError(
            writeBadDefinitionTypeMessage("boolean")
        )
    })
    it("number", () => {
        // @ts-expect-error
        attest(() => type({ bad: 5 })).throwsAndHasTypeError(
            writeBadDefinitionTypeMessage("number")
        )
    })
    it("bigint", () => {
        // @ts-expect-error
        attest(() => type({ bad: 99999n })).throwsAndHasTypeError(
            writeBadDefinitionTypeMessage("bigint")
        )
    })
    it("symbol", () => {
        // @ts-expect-error
        attest(() => type({ bad: Symbol() })).throwsAndHasTypeError(
            writeBadDefinitionTypeMessage("symbol")
        )
    })
})
