import { attest } from "@arktype/attest"
import { type } from "arktype"
import { suite, test } from "mocha"
import { writeBadDefinitionTypeMessage } from "../parser/definition.js"

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
		// doesn't error, so this test is just to ensure it doesn't infinitely recurse
		const t = type({ bad: {} as any })
		attest(t.infer).typed as {}
	})
	test("unknown", () => {
		// @ts-expect-error just results in base completions, so we just check there's an error
		attest(() => type({ bad: {} as unknown })).type.errors("")
	})
})
