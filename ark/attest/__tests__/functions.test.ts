import { attest } from "@arktype/attest"
import { fileName } from "@arktype/fs"
import * as assert from "node:assert/strict"
import { basename } from "node:path"
import { it } from "vitest"

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

it("valid type errors", () => {
	// @ts-expect-error
	attest(o.re.length.nonexistent).type.errors(
		/Property 'nonexistent' does not exist on type 'number'/
	)
	attest(o).type.errors("")
	// @ts-expect-error
	attest(() => shouldThrow(5, "")).type.errors.is(
		"Expected 1 arguments, but got 2."
	)
})

it("bad type errors", () => {
	assert.throws(
		() => attest(o).type.errors(/This error doesn't exist/),
		assert.AssertionError,
		"doesn't exist"
	)
	assert.throws(
		() =>
			attest(() =>
				// @ts-expect-error
				shouldThrow("this is a type error")
			).type.errors.is(""),
		assert.AssertionError,
		"not assignable"
	)
})

it("chainable", () => {
	attest<{ re: string }>(o).equals({ re: "do" })
	// @ts-expect-error
	attest(() => throwError("this is a type error"))
		.throws("Test error.")
		.type.errors("Expected 0 arguments, but got 1.")
})

it("bad chainable", () => {
	assert.throws(
		() =>
			attest(n)
				.equals(5)
				.type.errors.equals("Expecting an error here will throw"),
		assert.AssertionError,
		"Expecting an error"
	)
	assert.throws(
		() => attest(n).is(7).type.toString("string"),
		assert.AssertionError,
		"7"
	)
})

it("throwsAndHasTypeError", () => {
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

it("throws empty", () => {
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

it("stack starts from test file", () => {
	const e = getThrownError(() => attest(1 + 1).equals(3))
	assert.match(e.stack!.split("\n")[1], new RegExp(basename(fileName())))
})
