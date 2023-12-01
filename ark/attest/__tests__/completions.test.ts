import { type } from "arktype"
import assert from "assert"
import { describe, test } from "mocha"
import { attest } from "../assert/attest.js"

type Obj = {
	prop1: string
	prop2: string
	extra: unknown
}
const obj: Obj = { prop1: "", prop2: "", extra: "" }

describe("completions", () => {
	test("quote types", () => {
		// @ts-expect-error
		attest(() => type("st")).completions({ st: ["string"] })
		// prettier-ignore
		// @ts-expect-error
		attest(() => type('st')).completions({st:["string"]})
		//@ts-expect-error
		attest(() => type(`st`)).completions({ st: ["string"] })
	})
	test(".type.completions", () => {
		//@ts-expect-error
		attest(() => type({ a: "u" })).type.completions({
			u: ["undefined", "unknown", "uppercase", "uuid", "url"]
		})
	})
	test("keys", () => {
		//@ts-expect-error
		attest(() => type("number", "@", { "": "string" })).completions({
			"": ["description"]
		})
	})
	test("keys from cast object", () => {
		//@ts-expect-error
		attest({ "": "data" } as Obj).completions({
			"": ["extra", "prop1", "prop2"]
		})
	})
	test("index access", () => {
		//@ts-expect-error
		attest(() => obj[""]).type.completions({
			"": ["extra", "prop1", "prop2"]
		})
	})
	test("duplicate string error", () => {
		assert.throws(
			() => attest({ "": "" }).type.completions({}),
			Error,
			"multiple completion candidates"
		)
	})
	test("empty", () => {
		attest("").completions({})
	})
})
