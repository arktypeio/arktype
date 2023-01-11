import { describe, it } from "mocha"
import { type } from "../api.ts"
import { attest } from "../dev/attest/api.ts"
import { buildBadDefinitionTypeMessage } from "../src/parse/definition.ts"

describe("bad definition types", () => {
    it("unknown", () => {
        // @ts-expect-error
        attest(type({} as unknown)).type.errors(
            "Cannot statically parse a definition inferred as unknown. Use 'type.dynamic(...)' instead."
        )
    })
    it("undefined", () => {
        // @ts-expect-error
        attest(() => type({ bad: undefined })).throwsAndHasTypeError(
            buildBadDefinitionTypeMessage("undefined")
        )
    })
    it("null", () => {
        // @ts-expect-error
        attest(() => type({ bad: null })).throwsAndHasTypeError(
            buildBadDefinitionTypeMessage("null")
        )
    })
    it("boolean", () => {
        // @ts-expect-error
        attest(() => type({ bad: true })).throwsAndHasTypeError(
            buildBadDefinitionTypeMessage("boolean")
        )
    })
    it("number", () => {
        // @ts-expect-error
        attest(() => type({ bad: 5 })).throwsAndHasTypeError(
            buildBadDefinitionTypeMessage("number")
        )
    })
    it("bigint", () => {
        // @ts-expect-error
        attest(() => type({ bad: 99999n })).throwsAndHasTypeError(
            buildBadDefinitionTypeMessage("bigint")
        )
    })
    it("symbol", () => {
        // @ts-expect-error
        attest(() => type({ bad: Symbol() })).throwsAndHasTypeError(
            buildBadDefinitionTypeMessage("symbol")
        )
    })
    it("objects", () => {
        // @ts-expect-error
        attest(() => type({ bad: () => {} })).throwsAndHasTypeError(
            buildBadDefinitionTypeMessage("Function")
        )
    })
})
