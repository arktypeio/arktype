import { attest, contextualize } from "@ark/attest"
import { scope, type } from "arktype"

contextualize(() => {
	it("divisible", () => {
		const t = type("number%2")
		attest(t(4)).snap(4)
		attest(t(5).toString()).snap("must be even (was 5)")
	})

	it("range", () => {
		const t = type("number>2")
		attest(t(3)).snap(3)
		attest(t(2).toString()).snap("must be more than 2 (was 2)")
	})

	it("domain", () => {
		const t = type("number")
		attest(t(5)).snap(5)
		attest(t("foo").toString()).snap("must be a number (was a string)")
	})

	it("pattern", () => {
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
		attest(t(2).toString()).snap("must be a string or an object (was a number)")
		attest(t({}).toString()).snap("must be an array (was object)")
	})

	it("tuple length", () => {
		const t = type(["string", "number", "string", "string[]"])
		const data: typeof t.infer = ["foo", 5, "boo", []]
		attest(t(data)).equals(data)
		attest(t(["hello"]).toString()).snap("must be exactly length 4 (was 1)")
	})

	it("branches", () => {
		const t = type({ bar: "boolean" }, "|", { foo: "string" })
		attest(t({ foo: "ok" })).snap({ foo: "ok" })
		attest(t({ bar: true })).snap({ bar: true })
		attest(t({}).toString()).snap(
			"bar must be boolean (was missing) or foo must be a string (was missing)"
		)
		attest(t({ bar: "swapped", foo: true }).toString()).snap(
			'bar must be boolean (was "swapped") or foo must be a string (was boolean)'
		)
	})

	it("common errors collapse", () => {
		const t = type({ base: "1", a: "1" }, "|", { base: "1", b: "1" })
		attest(t({ base: 1, a: 1 })).snap({ base: 1, a: 1 })
		attest(t({ base: 1, b: 1 })).snap({ base: 1, b: 1 })
		attest(t({ a: 1, b: 1 }).toString()).snap("base must be 1 (was missing)")
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
			"a must be a number, a string or null (was undefined)"
		)
		// unsatisfying value
		attest(t({ a: false }).toString()).snap(
			"a must be a number, a string or null (was boolean)"
		)
	})

	// previously was affected by a caching issue
	// https://github.com/arktypeio/arktype/issues/962
	it("multiple switch", () => {
		const types = scope({
			a: { foo: "string" },
			b: { foo: "number" },
			c: { foo: "Function" },
			d: "a|b|c"
		}).export()
		attest(types.d({}).toString()).snap(
			"foo must be an object, a number or a string (was undefined)"
		)
		attest(types.d({ foo: null }).toString()).snap(
			"foo must be an object, a number or a string (was null)"
		)
	})

	it("serialized actual for discriminated union", () => {
		const t = type({ a: "'foo'" }).or({ a: "'bar'" })
		attest(t({ a: '"extra quotes"' }).toString()).snap(
			'a must be "bar" or "foo" (was "\\"extra quotes\\"")'
		)
		attest(t({ a: "" }).toString()).snap('a must be "bar" or "foo" (was "")')
		attest(t({ a: 5 }).toString()).snap('a must be "bar" or "foo" (was 5)')
	})

	it("multi", () => {
		const naturalNumber = type("number.integer>0")
		attest(naturalNumber(-1.2).toString()).snap(`(-1.2) must be...
  • an integer
  • positive`)
		const naturalAtPath = type({
			natural: naturalNumber
		})
		attest(naturalAtPath({ natural: -0.1 }).toString())
			.snap(`natural (-0.1) must be...
  • an integer
  • positive`)
	})

	it("homepage example", () => {
		const user = type({
			name: "string",
			luckyNumbers: "(number | bigint)[]",
			"isAdmin?": "boolean | null"
		})

		const out = user({
			luckyNumbers: [31, "255", 1337n],
			isAdmin: 1
		})

		attest(out.toString())
			.snap(`luckyNumbers[1] must be a bigint or a number (was a string)
name must be a string (was missing)
isAdmin must be false, null or true (was 1)`)
	})

	it("relative path", () => {
		const signup = type({
			email: "string.email",
			password: "string",
			repeatPassword: "string"
		}).narrow(
			(d, ctx) =>
				d.password === d.repeatPassword ||
				ctx.reject({
					expected: "identical to password",
					actual: "",
					relativePath: ["repeatPassword"]
				})
		)

		// ensure the relativePath is relative
		const nestedSignup = type({
			user: signup
		})

		const validSignup: typeof signup.infer = {
			email: "david@arktype.io",
			password: "secure",
			repeatPassword: "secure"
		}

		const valid: typeof nestedSignup.infer = { user: validSignup }

		attest(nestedSignup(valid)).equals(valid)
		attest(
			nestedSignup({
				user: { ...validSignup, repeatPassword: "insecure" }
			}).toString()
		).snap("user.repeatPassword must be identical to password")
	})

	// https://github.com/arktypeio/arktype/issues/1149
	it("morphs apply when not at an error path, even on failed validation", () => {
		const ageType = type("string.numeric.parse").to("number>18")
		const objType = type({ name: "string", "age?": ageType })

		const out = objType({ name: 2, age: "2" })
		attest(out.toString()).snap(`name must be a string (was a number)
age must be more than 18 (was 2)`)
	})

	it("morphs don't apply when at an error path", () => {
		let callCount = 0
		const t = type("unknown")
			.narrow((data, ctx) => ctx.mustBe("valid"))
			.pipe(() => callCount++)

		const out = t(1)

		attest(out.toString()).snap("must be valid (was 1)")
		attest(callCount).equals(0)
	})

	it("morphs don't apply when under an error path", () => {
		let callCount = 0
		const t = type({
			foo: ["unknown", "=>", () => callCount++]
		}).filter((data, ctx) => ctx.mustBe("valid"))

		attest(t.t).type.toString.snap("{ foo: (In: unknown) => Out<number> }")
		const out = t({ foo: 1 })

		attest(out.toString()).snap('must be valid (was {"foo":1})')
		attest(callCount).equals(0)
	})
})
