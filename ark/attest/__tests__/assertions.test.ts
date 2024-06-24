import { attest } from "@arktype/attest"
import * as assert from "node:assert/strict"

const o = { ark: "type" }

describe("type assertions", () => {
	it("type parameter", () => {
		attest<{ ark: string }>(o)
		assert.throws(
			// @ts-expect-error
			() => attest<{ ark: "type" }>(o),
			assert.AssertionError,
			"type"
		)
	})

	it("type-only assertion", () => {
		attest<{ ark: string }, typeof o>()
		assert.throws(
			// @ts-expect-error
			() => attest<{ ark: "type" }, typeof o>(),
			assert.AssertionError,
			"type"
		)
	})

	it("type toString", () => {
		attest(o).type.toString("{ ark: string; }")
		attest(o).type.toString.is("{ ark: string; }")
	})

	it("equals", () => {
		attest(o).equals({ ark: "type" })
	})

	it("object", () => {
		attest<{ i: string }>({ i: "love my wife" })
		assert.throws(
			// @ts-expect-error
			() => attest<{ g: string }>({ g: "whiz" as unknown }),
			assert.AssertionError,
			"unknown"
		)
	})

	it("typed allows equivalent types", () => {
		const actual = { a: true, b: false }
		attest<{
			b: boolean
			a: boolean
		}>(actual)
	})

	it("functional asserts don't exist on pure value types", () => {
		// @ts-expect-error
		attest(5).throws
	})

	it("not equal", () => {
		assert.throws(
			() => attest(o).equals({ ark: "typo" }),
			assert.AssertionError,
			"type !== typo"
		)
	})

	it("instanceOf", () => {
		const d = new Date()
		attest(d).instanceOf(Date)
		assert.throws(() => attest(d).instanceOf(RegExp), assert.AssertionError)
	})

	it("incorrect type", () => {
		assert.throws(
			// @ts-expect-error
			() => attest<{ re: number }>(o),
			assert.AssertionError,
			"o is not of type number"
		)
	})

	it("any type", () => {
		attest<any>(o as any)
		assert.throws(
			() => attest<any>({} as unknown),
			assert.AssertionError,
			"unknown"
		)
	})

	it("assert unknown ignores type", () => {
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

	it("multiline", () => {
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

	it("nonexistent types always fail", () => {
		// @ts-expect-error
		const nonexistent: NonExistent = {}
		assert.throws(
			() => attest<{ something: "specific" }>(nonexistent),
			assert.AssertionError,
			"specific"
		)
	})
})
