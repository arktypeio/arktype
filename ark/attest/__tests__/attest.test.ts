import * as assert from "node:assert/strict"
import { attest } from "@arktype/attest"
import { describe, test } from "mocha"

const o = { ark: "type" }

describe("attest", () => {
	test("type parameter", () => {
		attest<{ ark: string }>(o)
		assert.throws(
			// @ts-expect-error
			() => attest<{ ark: "type" }>(o),
			assert.AssertionError,
			"type"
		)
	})
	test("type-only assertion", () => {
		attest<{ ark: string }, typeof o>()
		assert.throws(
			// @ts-expect-error
			() => attest<{ ark: "type" }, typeof o>(),
			assert.AssertionError,
			"type"
		)
	})
	test("type toString", () => {
		attest(o).type.toString("{ ark: string; }")
		attest(o).type.toString.is("{ ark: string; }")
	})
	test("typed", () => {
		attest(o).typed as { ark: string }
	})
	test("equals", () => {
		attest(o).equals({ ark: "type" })
	})
	test("object", () => {
		attest({ i: "love my wife" }).typed as { i: string }
		assert.throws(
			() => attest({ g: "whiz" as unknown }).typed as { g: string },
			assert.AssertionError,
			"unknown"
		)
	})
	test("typed allows equivalent types", () => {
		const actual = { a: true, b: false }
		attest(actual).typed as {
			b: boolean
			a: boolean
		}
	})
	test("nonexistent types always fail", () => {
		// @ts-expect-error
		const nonexistent: NonExistent = {}
		assert.throws(
			() =>
				attest(nonexistent).typed as {
					something: "specific"
				},
			assert.AssertionError,
			"specific"
		)
	})
	test("functional asserts don't exist on pure value types", () => {
		// @ts-expect-error
		attest(5).throws
	})
})
