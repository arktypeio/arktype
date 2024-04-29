import { attest, contextualize } from "@arktype/attest"
import { scope, type } from "arktype"

contextualize(() => {
	it("divisible", () => {
		const t = type("number%2")
		attest(t(4)).snap(4)
		attest(t(5).toString()).snap("must be a multiple of 2 (was 5)")
	})

	it("range", () => {
		const t = type("number>2")
		attest(t(3)).snap(3)
		attest(t(2).toString()).snap("must be more than 2 (was 2)")
	})

	it("domain", () => {
		const t = type("number")
		attest(t(5)).snap(5)
		attest(t("foo").toString()).snap("must be a number (was string)")
	})

	it("regex", () => {
		const t = type("/.*@arktype.io/")
		attest(t("shawn@arktype.io")).snap("shawn@arktype.io")
		attest(t("shawn@hotmail.com").toString()).snap(
			'must be matched by .*@arktype.io (was "shawn@hotmail.com")'
		)
	})

	it("required keys", () => {
		const t = type({
			name: "string",
			age: "number",
			"title?": "string"
		})
		attest(t({ name: "Shawn", age: 99 })).snap({
			name: "Shawn",
			age: 99
		})
		attest(t({ name: "Shawn" }).toString()).snap(
			"age must be a number (was missing)"
		)
	})

	it("customized builtin problem", () => {
		const types = scope(
			{ isEven: "number%2" },
			{
				divisor: {
					expected: ctx => `% ${ctx.rule} !== 0`,
					problem: ctx => `${ctx.actual} ${ctx.expected}`
				}
			}
		).export()
		attest(types.isEven(3).toString()).snap("3 % 2 !== 0")
	})

	it("domains", () => {
		const t = type("string|number[]")
		attest(t([1])).snap([1])
		attest(t("hello")).snap("hello")
		attest(t(2).toString()).snap("must be a string or an array (was number)")
	})

	it("tuple length", () => {
		const t = type(["string", "number", "string", "string[]"])
		const data: typeof t.infer = ["foo", 5, "boo", []]
		attest(t(data)).equals(data)
		attest(t(["hello"]).toString()).snap(
			'must be exactly length 4 (was ["hello"])'
		)
	})

	it("branches", () => {
		const t = type({ bar: "boolean" }, "|", { foo: "string" })
		attest(t({ foo: "ok" })).snap({ foo: "ok" })
		attest(t({ bar: true })).snap({ bar: true })
		attest(t({}).toString()).snap(
			"bar must be boolean (was missing) or foo must be a string (was missing)"
		)
		attest(t({ bar: "swapped", foo: true }).toString()).snap(
			'bar must be boolean (was "swapped") or foo must be a string (was true)'
		)
	})

	it("branches at path", () => {
		const t = type({ key: [{ a: "string" }, "|", { b: "boolean" }] })
		attest(t({ key: { a: "ok" } })).snap({ key: { a: "ok" } })
		attest(t({ key: { b: true } })).snap({ key: { b: true } })
		attest(t({ key: {} }).toString()).snap(
			"key.a must be a string (was missing) or key.b must be boolean (was missing)"
		)
	})

	it("switch", () => {
		const t = type({ a: "string" }).or({ a: "null" }).or({ a: "number" })
		attest(t({ a: "ok" })).snap({ a: "ok" })
		attest(t({ a: 5 })).snap({ a: 5 })
		// value isn't present
		attest(t({}).toString()).snap(
			"a must be a number, a string or null (was missing)"
		)
		// unsatisfying value
		attest(t({ a: false }).toString()).snap(
			"a must be a number, a string or null (was false)"
		)
	})

	it("multiple switch", () => {
		const types = scope({
			a: { foo: "string" },
			b: { foo: "number" },
			c: { foo: "Function" },
			d: "a|b|c"
		}).export()
		attest(types.d({}).toString()).snap(
			"foo must be a function, a number or a string (was missing)"
		)
		attest(types.d({ foo: null }).toString()).snap(
			"foo must be a function, a number or a string (was null)"
		)
	})

	it("multi", () => {
		const naturalNumber = type("integer>0")
		attest(naturalNumber(-1.2).toString()).snap(
			`must be...
  • an integer
  • more than 0`
		)
		const naturalAtPath = type({
			natural: naturalNumber
		})
		attest(naturalAtPath({ natural: -0.1 }).toString()).snap(
			`natural must be...
  • an integer
  • more than 0`
		)
	})
})
