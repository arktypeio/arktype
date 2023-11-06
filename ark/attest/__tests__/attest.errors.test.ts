import * as assert from "node:assert/strict"
import { attest } from "@arktype/attest"
import { describe, test } from "mocha"

const n = 5
const o = { re: "do" }

describe("attest errors", () => {
	test("not equal", () => {
		assert.throws(
			() => attest(o).equals({ re: "doo" }),
			assert.AssertionError,
			"do !== doo"
		)
	})
	test("incorrect type", () => {
		assert.throws(
			() => attest(o).typed as { re: number },
			assert.AssertionError,
			"o is not of type number"
		)
	})
	test("any type", () => {
		attest(o as any).typed as any
		assert.throws(
			() => attest({} as unknown).typed as any,
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
		attest({
			several: true,
			lines: true,
			long: true
		} as object).typed as object
		assert.throws(
			() =>
				attest({
					several: true,
					lines: true,
					long: true
				}).typed as object,
			assert.AssertionError,
			"object"
		)
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
})
