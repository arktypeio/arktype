import { attest } from "@arktype/attest"
import { suite, test } from "mocha"
import { type } from "../src/main.js"
import { writeBadDefinitionTypeMessage } from "../type/parser/definition.js"

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
	test("any", () => {
		// @ts-expect-error
		attest(() => type({ bad: {} as any })).types.errors(
			`Type 'any' is not assignable to type 'never'`
		)
	})
	test("unknown", () => {
		// @ts-expect-error just results in base completions, so we just check there's an error
		attest(() => type({ bad: {} as unknown })).types.errors("")
	})
})
