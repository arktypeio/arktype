import { scope, type } from "arktype"
import assert from "assert"
import { describe, test } from "mocha"
import { attest } from "../assert/attest.js"

type Obj = {
	prop1: string
	prop2: string
	extra: unknown
}
const obj: Obj = { prop1: "", prop2: "", extra: "" }
describe("autocompletes", () => {
	describe("String completions", () => {
		test("Allows different quote types", () => {
			attest(() => type("string")).type.completions({})
			// prettier-ignore
			// @ts-expect-error
			attest(() => type('st')).type.completions({"st":["string"]})
			//@ts-expect-error
			attest(() => type(`st`)).type.completions({ st: ["string"] })
		})
		test("Completions shortcut", () => {
			//@ts-expect-error
			attest(() => type({ a: "u" })).completions({
				u: ["undefined", "unknown", "uppercase", "uuid", "url"]
			})
		})
	})

	describe("Key completions", () => {
		test("Casted object", () => {
			//@ts-expect-error
			attest({ "": "data" } as Obj).completions({
				"": ["extra", "prop1", "prop2"]
			})
			test("Lists available keys", () => {
				//@ts-expect-error
				attest(() => type("number", "@", { "": "string" })).completions({
					"": ["description"]
				})
			})
		})

		describe("Property access", () => {
			test("Autocompletes properties", () => {
				//@ts-expect-error
				attest(() => obj[""]).type.completions({
					"": ["extra", "prop1", "prop2"]
				})
			})
		})
		describe("Errors", () => {
			test("Throws on duplicate string", () => {
				assert.throws(
					() => attest({ "": "" }).type.completions({}),
					Error,
					"multiple completion candidates"
				)
			})

			test("Unresolvable", () => {
				attest("").completions({})
			})
		})
	})
})
