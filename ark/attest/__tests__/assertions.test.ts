import { attest } from "@ark/attest"
import { MissingSnapshotError } from "@ark/attest/internal/assert/assertions.ts"
import { attestInternal } from "@ark/attest/internal/assert/attest.ts"
import { type } from "arktype"
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
		attest(o).type.toString("{ ark: string }")
		attest(o).type.toString.is("{ ark: string }")
		attest(o).type.toString.satisfies(/^{.*}$/)
		assert.throws(
			() => attest(o).type.toString.satisfies(/^a.*z$/),
			assert.AssertionError,
			"typfsde"
		)
	})

	it("type toString regex", () => {
		attest(o).type.toString(/^{.*}$/)
		assert.throws(
			() => attest(o).type.toString(/^a.*z$/),
			assert.AssertionError,
			"typfsde"
		)
	})

	it("type toString multiline", () => {
		const obj = {
			ark: "type",
			type: "script",
			vali: "dator",
			opti: "mized",
			from: "editor",
			to: "runtime"
		}

		attest(obj).type.toString.is(`{
	ark: string
	type: string
	vali: string
	opti: string
	from: string
	to: string
}`)
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
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
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

	it("does not boom on Type comparison", () => {
		// @ts-expect-error
		attest(() => attest(type.string).equals(type.number)).throws
			.equals(`AssertionError [ERR_ASSERTION]: Assertion including at least one function or object was not between reference equal items
Expected: number
Actual: string`)
	})

	// node:assert's diff of these exhausted memory (#1287)
	it("does not boom on nested Types", () => {
		// @ts-expect-error
		attest(() => attest({ a: type.string }).equals({ a: type.boolean })).throws
			.snap(`AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
Expected: {"a":"boolean"}
Actual: {"a":"string"}`)
	})

	it("does not boom on a schema node", () => {
		// @ts-expect-error
		attest(() => attest([type.string.internal]).equals([undefined])).throws
			.snap(`AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
Expected: [undefined]
Actual: ["string"]`)
	})

	it("does not boom on a schema node that isn't the one expected", () => {
		attest(() => attest(type.string.internal).is(type.number.internal)).throws
			.snap(`AssertionError [ERR_ASSERTION]: Expected values to be reference-equal:
Expected: number
Actual: string`)
	})

	it("diffs plain data as node:assert does", () => {
		attest(() =>
			attest(new Map([["a", [1]]])).equals(new Map([["a", [2]]]))
		).throws("+ actual - expected")
	})

	it("doesn't boom on ArkErrors vs plain object", () => {
		attest(() => attest(type({ a: "string" })({ a: 5 })).equals({ a: "five" }))
			.throws
			.snap(`AssertionError [ERR_ASSERTION]: Objects did not have the same constructor:
Expected: {"a":"five"}
Actual: ArkErrors`)
	})

	it("jsdoc ", () => {
		type O = {
			/** FOO */
			foo: string
			bar: number
		}

		const o: O = {
			foo: "foo",
			bar: 5
		}

		attest(o.foo).jsdoc.equals("FOO")

		assert.throws(
			() => attest(o.bar).jsdoc.equals("BAR"),
			assert.AssertionError,
			"BAR"
		)
	})

	it("failOnMissingSnapshots", () => {
		assert.throws(
			() =>
				attestInternal("", { cfg: { failOnMissingSnapshots: true } }).snap(),
			MissingSnapshotError
		)
	})
})
