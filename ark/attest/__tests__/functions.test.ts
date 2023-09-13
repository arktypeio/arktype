import * as assert from "node:assert/strict"
import { basename } from "node:path"
import { attest } from "@arktype/attest"
import { fileName } from "@arktype/fs"
import { describe, test } from "mocha"

const n = 5
const o = { re: "do" }
const shouldThrow = (a: false) => {
	if (a) {
		throw new Error(`${a} is not assignable to false`)
	}
}
const throwError = () => {
	throw new Error("Test error.")
}
describe("assertion errors", () => {
	test("valid type errors", () => {
		// @ts-expect-error
		attest(o.re.length.nonexistent).types.errors(
			/Property 'nonexistent' does not exist on type 'number'/
		)
		attest(o).types.errors("")
		// @ts-expect-error
		attest(() => shouldThrow(5, "")).types.errors.is(
			"Expected 1 arguments, but got 2."
		)
	})
	test("bad type errors", () => {
		assert.throws(
			() => attest(o).types.errors(/This error doesn't exist/),
			assert.AssertionError,
			"doesn't exist"
		)
		assert.throws(
			() =>
				attest(() =>
					// @ts-expect-error
					shouldThrow("this is a type error")
				).types.errors.is(""),
			assert.AssertionError,
			"not assignable"
		)
	})
	test("chainable", () => {
		attest(o).equals({ re: "do" }).typed as { re: string }
		// @ts-expect-error
		attest(() => throwError("this is a type error"))
			.throws("Test error.")
			.types.errors("Expected 0 arguments, but got 1.")
	})
	test("bad chainable", () => {
		assert.throws(
			() =>
				attest(n)
					.equals(5)
					.types.errors.equals("Expecting an error here will throw"),
			assert.AssertionError,
			"Expecting an error"
		)
		assert.throws(
			() => attest(n).is(7).types.toString("string"),
			assert.AssertionError,
			"7"
		)
	})
	test("throwsAndHasTypeError", () => {
		// @ts-expect-error
		attest(() => shouldThrow(true)).throwsAndHasTypeError(
			/true[\S\s]*not assignable[\S\s]*false/
		)
		// No thrown error
		assert.throws(
			() =>
				// @ts-expect-error
				attest(() => shouldThrow(null)).throwsAndHasTypeError("not assignable"),
			assert.AssertionError,
			"didn't throw"
		)
		// No type error
		assert.throws(
			() =>
				attest(() => shouldThrow(true as any)).throwsAndHasTypeError(
					"not assignable"
				),
			assert.AssertionError,
			"not assignable"
		)
	})
	test("throws empty", () => {
		attest(throwError).throws()
		assert.throws(
			() => attest(() => shouldThrow(false)).throws(),
			assert.AssertionError,
			"didn't throw"
		)
	})

	const getThrownError = (f: () => void) => {
		try {
			f()
		} catch (e) {
			if (e instanceof Error) {
				return e
			}
		}
		throw new Error("Expected function to throw an error.")
	}

	test("stack starts from test file", () => {
		const e = getThrownError(() => attest(1 + 1).equals(3))
		assert.match(e.stack!.split("\n")[1], new RegExp(basename(fileName())))
	})
})
