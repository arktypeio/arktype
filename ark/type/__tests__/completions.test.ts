import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"

contextualize(() => {
	it("completes standalone keyword", () => {
		// @ts-expect-error
		attest(() => type("s")).completions({ s: ["semver", "string", "symbol"] })
	})

	it("completes within objects", () => {
		// @ts-expect-error
		attest(() => type({ a: "a", b: "b" })).completions({
			a: ["alpha", "alphanumeric", "any"],
			b: ["bigint", "boolean"]
		})
	})

	it("completes within expressions", () => {
		// @ts-expect-error
		attest(() => type("string|n")).completions({
			"string|n": [
				"string|never",
				"string|nonNegativeIntegerString",
				"string|null",
				"string|number"
			]
		})
	})

	it("completes within expressions in objects", () => {
		// @ts-expect-error
		attest(() => type({ key: "number | b" })).completions({
			"number | b": ["number | bigint", "number | boolean"]
		})
	})

	it("completes user-defined aliases", () => {
		const $ = scope({
			over9000: "number>9000",
			myArk: {
				kind: "'type'",
				buoyancy: "null",
				dxLevel: "over9000"
			},
			noahsArk: {
				kind: "'boat'",
				buoyancy: "over9000",
				dxLevel: "null"
			}
		})
		// this could also have been defined with completions directly in scope!
		attest(() =>
			$.type({
				// @ts-expect-error
				type: "my",
				// @ts-expect-error
				boat: "noah"
			})
		).completions({ my: ["myArk"], noah: ["noahsArk"] })
	})
})
