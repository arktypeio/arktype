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
	test("equals", () => {
		attest(o).equals({ ark: "type" })
	})
	test("object", () => {
		attest<{ i: string }>({ i: "love my wife" })
		assert.throws(
			// @ts-expect-error
			() => attest<{ g: string }>({ g: "whiz" as unknown }),
			assert.AssertionError,
			"unknown"
		)
	})
	test("typed allows equivalent types", () => {
		const actual = { a: true, b: false }
		attest<{
			b: boolean
			a: boolean
		}>(actual)
	})
	test("functional asserts don't exist on pure value types", () => {
		// @ts-expect-error
		attest(5).throws
	})
	test("not equal", () => {
		assert.throws(
			() => attest(o).equals({ ark: "typo" }),
			assert.AssertionError,
			"type !== typo"
		)
	})
	test("incorrect type", () => {
		assert.throws(
			// @ts-expect-error
			() => attest<{ re: number }>(o),
			assert.AssertionError,
			"o is not of type number"
		)
	})
	test("any type", () => {
		attest<any>(o as any)
		assert.throws(
			() => attest<any>({} as unknown),
			assert.AssertionError,
			"unknown"
		)
	})
	test("assert unknown ignores type", () => {
		const myValue = { a: ["+"] } as const
		const myExpectedValue = { a: ["+"] }
		// @ts-expect-error
		attest(myValue).equals(myExpectedValue)
		attest(myValue).unknown.equals(myExpectedValue)
		assert.throws(
			() => attest(myValue).unknown.is(myExpectedValue),
			assert.AssertionError,
			"not reference-equal"
		)
	})
	test("multiline", () => {
		attest<object>({
			several: true,
			lines: true,
			long: true
		} as object)
		assert.throws(
			() =>
				attest<object>({
					several: true,
					lines: true,
					long: true
				}),
			assert.AssertionError
		)
	})
	test("nonexistent types always fail", () => {
		// @ts-expect-error
		const nonexistent: NonExistent = {}
		assert.throws(
			() => attest<{ something: "specific" }>(nonexistent),
			assert.AssertionError,
			"specific"
		)
	})
})
