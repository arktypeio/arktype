import { attest } from "@arktype/attest"
import { scope, type } from "arktype"

it("completes standalone keyword", () => {
	// @ts-expect-error
	attest(() => type("s")).completions({
		s: ["string", "symbol", "semver"]
	})
})

it("completes within objects", () => {
	// @ts-expect-error
	attest(() => type({ a: "a", b: "b" })).completions({
		a: ["any", "alpha", "alphanumeric"],
		b: ["bigint", "boolean"]
	})
})

it("completes within expressions", () => {
	// @ts-expect-error
	attest(() => type("string|n")).completions({
		"string|n": ["string|number", "string|null", "string|never"]
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
