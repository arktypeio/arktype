import { attest } from "@arktype/attest"
import { type } from "arktype"
import { writeBadDefinitionTypeMessage } from "../parser/definition.ts"

describe("definitions", () => {
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
	it("any", () => {
		// doesn't error, so this test is just to ensure it doesn't infinitely recurse
		const t = type({ bad: {} as any })
		attest<{}>(t.infer)
	})
	it("unknown", () => {
		// @ts-expect-error just results in base completions, so we just check there's an error
		attest(() => type({ bad: {} as unknown })).type.errors("")
	})
})
