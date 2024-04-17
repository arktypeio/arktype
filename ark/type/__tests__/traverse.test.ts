import { attest } from "@arktype/attest"
import { scope, type } from "arktype"
import { describe, it } from "vitest"

describe("traverse", () => {
	it("divisible", () => {
		const t = type("number%2")
		attest(t(4).out).snap(4)
		attest(t(5).errors?.summary).snap("must be a multiple of 2 (was 5)")
	})
	it("range", () => {
		const t = type("number>2")
		attest(t(3).out).snap(3)
		attest(t(2).errors?.summary).snap("must be more than 2 (was 2)")
	})
	it("domain", () => {
		const t = type("number")
		attest(t(5).out).snap(5)
		attest(t("foo").errors?.summary).snap("must be a number (was string)")
	})
	it("regex", () => {
		const t = type("/.*@arktype.io/")
		attest(t("shawn@arktype.io").out).snap("shawn@arktype.io")
		attest(t("shawn@hotmail.com").errors?.summary).snap(
			'must be matched by .*@arktype.io (was "shawn@hotmail.com")'
		)
	})
	it("required keys", () => {
		const t = type({
			name: "string",
			age: "number",
			"title?": "string"
		})
		attest(t({ name: "Shawn", age: 99 }).out).snap({
			name: "Shawn",
			age: 99
		})
		attest(t({ name: "Shawn" }).errors?.summary).snap("age must be defined")
	})
	it("customized builtin problem", () => {
		const types = scope(
			{ isEven: "number%2" },
			{
				divisor: {
					expected: (inner) => `a multiple of ${inner.rule}`,
					problem: (ctx) => `${ctx.actual} is not ${ctx.expected}!`
				}
			}
		).export()
		attest(types.isEven(3).errors?.summary).snap("3 is not a multiple of 2!")
	})
	it("domains", () => {
		const t = type("string|number[]")
		attest(t([1]).out).snap([1])
		attest(t("hello").out).snap("hello")
		attest(t(2).errors?.summary).snap(
			"must be a string or an array (was number)"
		)
	})
	it("tuple length", () => {
		const t = type(["string", "number", "string", "string[]"])
		const data: typeof t.infer = ["foo", 5, "boo", []]
		attest(t(data).out).equals(data)
		attest(t(["hello"]).errors?.summary).snap(
			'must be exactly length 4 (was ["hello"])'
		)
	})
	it("branches", () => {
		const t = type([{ a: "string" }, "|", { b: "boolean" }])
		attest(t({ a: "ok" }).out).snap({ a: "ok" })
		attest(t({ b: true }).out).snap({ b: true })
		attest(t({}).errors?.summary).snap("a must be defined or b must be defined")
	})
	it("branches at path", () => {
		const t = type({ key: [{ a: "string" }, "|", { b: "boolean" }] })
		attest(t({ key: { a: "ok" } }).out).snap({ key: { a: "ok" } })
		attest(t({ key: { b: true } }).out).snap({ key: { b: true } })
		attest(t({ key: {} }).errors?.summary).snap(
			"key.a must be defined or key.b must be defined"
		)
	})
	it("switch", () => {
		const t = type({ a: "string" }).or({ a: "null" }).or({ a: "number" })
		attest(t({ a: "ok" }).out).snap({ a: "ok" })
		attest(t({ a: 5 }).out).snap({ a: 5 })
		// value isn't present
		attest(t({}).errors?.summary).snap("a must be defined")
		// unsatisfying value
		attest(t({ a: false }).errors?.summary).snap(
			"a must be a number, a string or null (was false)"
		)
	})
	it("multiple switch", () => {
		const types = scope({
			a: { a: "string" },
			b: { a: "number" },
			c: { a: "Function" },
			d: "a|b|c"
		}).export()
		attest(types.d({}).errors?.summary).snap("a must be defined")
		attest(types.d({ a: null }).errors?.summary).snap(
			"a must be a function, a number or a string (was null)"
		)
	})

	it("multi", () => {
		const naturalNumber = type("integer>0")
		attest(naturalNumber(-1.2).errors?.summary).snap(
			`must be...
  • an integer
  • more than 0`
		)
		const naturalAtPath = type({
			natural: naturalNumber
		})
		attest(naturalAtPath({ natural: -0.1 }).errors?.summary).snap(
			`natural must be...
  • an integer
  • more than 0`
		)
	})
})
