import { scope, type } from "arktype"
import assert from "assert"
import { describe, test } from "mocha"
import { attest } from "../assert/attest.js"

type Obj = {
	prop1: string
	prop2: string
	extra: unknown
}

describe("autocompletes", () => {
	describe("String completions", () => {
		test("Allows different quote types", () => {
			//@ts-expect-error
			attest(() => type("st")).type.completions.snap({ st: ["string"] })
		})
		test("Value completion with type", () => {
			//@ts-expect-error
			attest(() => type({ a: "n", b: "b" })).type.completions.snap({
				n: ["number", "null", "never"],
				b: ["bigint", "boolean"]
			})
		})
		test("Value completion with scope", () => {
			//@ts-expect-error
			attest(() => scope({ a: "st" })).type.completions.snap({ st: ["string"] })
		})
		test("Completions shortcut", () => {
			//@ts-expect-error
			attest(() => scope({ a: "u" })).completions.snap({
				u: ["undefined", "unknown", "uppercase", "uuid", "url"]
			})
		})
		test("Checks that results are equivalent", () => {
			//@ts-expect-error
			attest(() => type({ a: "u" })).completions.snap({
				u: ["undefined", "unknown", "uppercase", "uuid", "url"]
			})
			//@ts-expect-error
			attest(() => type({ a: "u" })).type.completions.snap({
				u: ["undefined", "unknown", "uppercase", "uuid", "url"]
			})
		})
	})

	describe("Key completions", () => {
		test("Casted object", () => {
			//@ts-expect-error
			attest(() => type({ "": "" } as Obj)).completions.snap({
				"": ["extra", "prop1", "prop2"]
			})
		})
		test("Typed object", () => {
			//@ts-expect-error
			attest(() => type("str", "@", { "": "" })).completions.snap({
				str: ["string"],
				"": ["description"]
			})
		})
	})

	describe("Property access", () => {
		test("Autocompletes properties", () => {
			//@ts-expect-error
			attest(() => type("string")[""]).type.completions.snap({
				"": [
					"allows",
					"and",
					"apply",
					"arguments",
					"array",
					"assert",
					"bind",
					"call",
					"caller",
					"condition",
					"config",
					"configure",
					"definition",
					"equals",
					"extends",
					"from",
					"fromIn",
					"infer",
					"inferIn",
					"inferMorph",
					"json",
					"keyof",
					"length",
					"morph",
					"name",
					"narrow",
					"or",
					"prototype",
					"root",
					"scope",
					"toString"
				]
			})
		})
	})
	describe("Errors", () => {
		test("Throws on repeated incomplete text samples", () => {
			assert.throws(
				() =>
					attest(
						// @ts-expect-error
						() => type({ a: "st", b: "st", c: "b" })
					).type.completions.snap("(undefined)"),
				Error,
				"Did not throw"
			)
		})

		  test("Unresolvable", () => {
			// @ts-expect-error
			attest(() => type("y")).completions.snap({})
		})
	})
})
