import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"
import { writeBadDefinitionTypeMessage } from "arktype/internal/parser/definition.ts"

contextualize(() => {
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
		const T = type({ bad: {} as any })
		attest<{ bad: any }>(T.infer)
	})

	it("never", () => {
		// can't error
		const T = type({ bad: {} as never })
		attest<{ bad: never }>(T.infer)
	})

	it("unknown", () => {
		// @ts-expect-error just results in base completions, so we just check there's an error
		attest(() => type({ bad: {} as unknown })).type.errors("")
	})
})
