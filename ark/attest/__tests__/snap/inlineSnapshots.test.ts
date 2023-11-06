import * as assert from "node:assert/strict"
import { attest } from "@arktype/attest"
import { describe, test } from "mocha"

const o = { re: "do" }
const shouldThrow = (a: false) => {
	if (a) {
		throw new Error(`${a} is not assignable to false`)
	}
}
const throwError = () => {
	throw new Error("Test error.")
}
describe("Assertions for Inline Snapshots", () => {
	test("default serializer doesn't care about prop order", () => {
		const actual = { a: true, b: false }
		attest(actual).snap({ b: false, a: true })
	})
	test("snap", () => {
		attest(o).snap({ re: `do` })
		attest(o).equals({ re: "do" }).type.toString.snap(`{ re: string; }`)
		assert.throws(
			() => attest(o).snap({ re: `dorf` }),
			assert.AssertionError,
			"dorf"
		)
	})
	test("value and type snap", () => {
		attest(o).snap({ re: `do` }).type.toString.snap(`{ re: string; }`)
		assert.throws(
			() => attest(o).snap({ re: `do` }).type.toString.snap(`{ re: number; }`),
			assert.AssertionError,
			"number"
		)
	})
	test("error and type error snap", () => {
		// @ts-expect-error
		attest(() => shouldThrow(true))
			.throws.snap(`Error: true is not assignable to false`)
			.type.errors.snap(
				`Argument of type 'true' is not assignable to parameter of type 'false'.`
			)
		assert.throws(
			() =>
				// @ts-expect-error
				attest(() => shouldThrow(1))
					.throws.snap(`Error: 1 is not assignable to false`)
					.type.errors.snap(
						`Argument of type '2' is not assignable to parameter of type 'false'.`
					),
			assert.AssertionError,
			"'2'"
		)
	})
	test("throws", () => {
		attest(throwError).throws(/error/g)
		assert.throws(
			// Snap should never be populated
			() => attest(() => shouldThrow(false)).throws.snap(),
			assert.AssertionError,
			"didn't throw"
		)
	})
	/*
	 * Some TS errors as formatted as diagnostic "chains"
	 * We represent them by joining the parts of the message with newlines
	 */
	test("TS diagnostic chain", () => {
		// @ts-expect-error
		attest(() => shouldThrow({} as {} | false)).type.errors.snap(
			`Argument of type 'false | {}' is not assignable to parameter of type 'false'.Type '{}' is not assignable to type 'false'.`
		)
	})
	test("multiple inline snaps", () => {
		attest("firstLine\nsecondLine").snap(`firstLine
secondLine`)
		attest("firstLine\nsecondLine").snap(`firstLine
secondLine`)
	})
})
