import { attest, contextualize } from "@ark/attest"
import {
	intrinsic,
	rootNode,
	writeIndivisibleMessage,
	writeInvalidKeysMessage,
	writeNonStructuralOperandMessage,
	writeUnsatisfiedParameterConstraintMessage
} from "@ark/schema"
import { ark, scope, type } from "arktype"
import type { Out, string } from "../ast.js"

contextualize(() => {
	describe("jsObjects", () => {
		it("Function", () => {
			// should not be treated as a morph
			attest<Function>(type("Function").infer)
		})

		it("Date", () => {
			// should not expand built-in classes
			attest(type("Date").infer).type.toString.snap("Date")
		})
	})

	describe("tsKeywords", () => {
		it("string strings", () => {
			/**
			 * 	In honor of @ark-expect-beta aka log(n):
			 * 		- Zirco author https://github.com/zirco-lang/zrc
			 * 		- Shameless Rust stan
			 * 		- Occasional user of ArkType libraries
			 * 		- Frequent user of ArkType Discord
			 * 		- Universally renowned two-finger speed typist
			 */
			const string = type("string")
			attest<string>(string.infer)
			attest(string("string")).snap("string")
		})

		it("any", () => {
			const any = type("any")
			// equivalent to unknown at runtime
			attest(any.json).equals(type("unknown").json)
			// inferred as any
			attest<any>(any.infer)
		})

		it("any in expression", () => {
			const t = type("string&any")
			attest<any>(t.infer)
			attest(t.json).equals(ark.string.json)
		})

		it("boolean", () => {
			const boolean = type("boolean")
			attest<boolean>(boolean.infer)
			const expected = rootNode([{ unit: false }, { unit: true }])
			// should be simplified to simple checks for true and false literals
			attest(boolean.json).equals(expected.json)
		})

		it("never", () => {
			const never = type("never")
			attest<never>(never.infer)
			const expected = rootNode([])
			// should be equivalent to a zero-branch union
			attest(never.json).equals(expected.json)
		})

		it("never in union", () => {
			const t = type("string|never")
			attest<string>(t.infer)
			attest(t.json).equals(ark.string.json)
		})

		it("unknown", () => {
			const expected = rootNode({})
			// should be equivalent to an unconstrained predicate
			attest(type("unknown").json).equals(expected.json)
		})
	})

	describe("validation", () => {
		it("integer", () => {
			const integer = type("integer")
			attest(integer(123)).equals(123)
			attest(integer("123").toString()).snap("must be a number (was string)")
			attest(integer(12.12).toString()).snap("must be an integer (was 12.12)")
		})
		it("alpha", () => {
			const alpha = type("alpha")
			attest(alpha("user")).snap("user")
			attest(alpha("user123").toString()).equals(
				'must be only letters (was "user123")'
			)
		})
		it("alphanumeric", () => {
			const alphanumeric = type("alphanumeric")
			attest(alphanumeric("user123")).snap("user123")
			attest(alphanumeric("user")).snap("user")
			attest(alphanumeric("123")).snap("123")
			attest(alphanumeric("abc@123").toString()).equals(
				'must be only letters and digits 0-9 (was "abc@123")'
			)
		})
		it("digits", () => {
			const digits = type("digits")
			attest(digits("123")).snap("123")
			attest(digits("user123").toString()).equals(
				'must be only digits 0-9 (was "user123")'
			)
		})
		it("lowercase", () => {
			const lowercase = type("lowercase")
			attest(lowercase("var")).snap("var")
			attest(lowercase("newVar").toString()).equals(
				'must be only lowercase letters (was "newVar")'
			)
		})
		it("uppercase", () => {
			const uppercase = type("uppercase")
			attest(uppercase("VAR")).snap("VAR")
			attest(uppercase("CONST_VAR").toString()).equals(
				'must be only uppercase letters (was "CONST_VAR")'
			)
			attest(uppercase("myVar").toString()).equals(
				'must be only uppercase letters (was "myVar")'
			)
		})
		it("email", () => {
			const email = type("email")
			attest(email("shawn@mail.com")).snap("shawn@mail.com")
			attest(email("shawn@email").toString()).equals(
				'must be a valid email (was "shawn@email")'
			)
		})
		it("uuid", () => {
			const uuid = type("uuid")
			attest(uuid("f70b8242-dd57-4e6b-b0b7-649d997140a0")).equals(
				"f70b8242-dd57-4e6b-b0b7-649d997140a0"
			)
			attest(uuid("1234").toString()).equals(
				'must be a valid UUID (was "1234")'
			)
		})

		it("credit card", () => {
			const validCC = "5489582921773376"
			attest(ark.creditCard(validCC)).equals(validCC)
			// Regex validation
			attest(ark.creditCard("0".repeat(16)).toString()).equals(
				'must be a valid credit card number (was "0000000000000000")'
			)
			// Luhn validation
			attest(ark.creditCard(validCC.slice(0, -1) + "0").toString()).equals(
				'must be a valid credit card number (was "5489582921773370")'
			)
		})
		it("semver", () => {
			attest(ark.semver("1.0.0")).snap("1.0.0")
			attest(ark.semver("-1.0.0").toString()).equals(
				'must be a valid semantic version (see https://semver.org/) (was "-1.0.0")'
			)
		})

		it("ip", () => {
			const ip = type("ip")

			// valid IPv4 address
			attest(ip("192.168.1.1")).snap("192.168.1.1")
			// valid IPv6 address
			attest(ip("2001:0db8:85a3:0000:0000:8a2e:0370:7334")).snap(
				"2001:0db8:85a3:0000:0000:8a2e:0370:7334"
			)

			attest(ip("192.168.1.256").toString()).snap(
				'must be a valid IPv4 address or a valid IPv6 address (was "192.168.1.256")'
			)
			attest(ip("2001:0db8:85a3:0000:0000:8a2e:0370:733g").toString()).snap(
				'must be a valid IPv4 address or a valid IPv6 address (was "2001:0db8:85a3:0000:0000:8a2e:0370:733g")'
			)
		})

		it("unixTimestamp", () => {
			const unixTimestamp = type("unixTimestamp")

			// valid Unix timestamp
			attest(unixTimestamp(1621530000)).equals(1621530000)
			attest(unixTimestamp(8640000000000000)).equals(8640000000000000)
			attest(unixTimestamp(-8640000000000000)).equals(-8640000000000000)
			// invalid Unix timestamp
			attest(unixTimestamp("foo").toString()).equals(
				"must be a number representing a Unix timestamp (was string)"
			)
			attest(unixTimestamp(1.5).toString()).equals(
				"must be an integer representing a Unix timestamp (was 1.5)"
			)
			attest(unixTimestamp(-8640000000000001).toString()).equals(
				"must be a Unix timestamp after -8640000000000000 (was -8640000000000001)"
			)
			attest(unixTimestamp(8640000000000001).toString()).equals(
				"must be a Unix timestamp before 8640000000000000 (was 8640000000000001)"
			)
		})
	})

	describe("parse", () => {
		it("json", () => {
			const parseJson = type("parse.json")
			attest(parseJson('{"a": "hello"}')).snap({ a: "hello" })
			attest(parseJson(123).toString()).snap("must be a string (was number)")
			attest(parseJson("foo").toString()).snap(
				'must be a valid JSON string (was "foo")'
			)
		})
		it("number", () => {
			const parseNum = type("parse.number")
			attest(parseNum("5")).equals(5)
			attest(parseNum("5.5")).equals(5.5)
			attest(parseNum("five").toString()).equals(
				'must be a well-formed numeric string (was "five")'
			)
		})
		it("integer", () => {
			const parseInt = type("parse.integer")
			attest(parseInt("5")).equals(5)
			attest(parseInt("5.5").toString()).equals(
				'must be a well-formed integer string (was "5.5")'
			)
			attest(parseInt("five").toString()).equals(
				'must be a well-formed integer string (was "five")'
			)
			attest(parseInt(5).toString()).snap("must be a string (was number)")
			attest(parseInt("9007199254740992").toString()).equals(
				'must be an integer in the range Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER (was "9007199254740992")'
			)
		})
		it("date", () => {
			const parseDate = type("parse.date")
			attest(parseDate("5/21/1993").toString()).snap(
				"Fri May 21 1993 00:00:00 GMT-0400 (Eastern Daylight Time)"
			)
			attest(parseDate("foo").toString()).equals(
				'must be a valid date (was "foo")'
			)
			attest(parseDate(5).toString()).snap("must be a string (was number)")
		})

		it("formData", () => {
			const user = type({
				email: "email",
				file: "File",
				tags: "liftArray<string>"
			})

			const parseUserForm = type("parse.formData").pipe(user)

			attest<
				(In: FormData) => Out<{
					email: string.matching<"?">
					file: File
					tags: (In: string | string[]) => Out<string[]>
				}>
			>(parseUserForm.t)

			// support Node18
			if (!globalThis.File) return

			const data = new FormData()
			const file = new File([], "")

			data.append("email", "david@arktype.io")
			data.append("file", file)
			data.append("tags", "typescript")
			data.append("tags", "arktype")

			const out = parseUserForm(data)
			attest(out).equals({
				email: "david@arktype.io",
				file,
				tags: ["typescript", "arktype"]
			})

			data.set("email", "david")
			data.set("file", null)
			data.append("tags", file)

			attest(parseUserForm(data).toString())
				.snap(`email must be a valid email (was "david")
file must be an instance of File (was string)
tags[2] must be a string (was object)`)
		})
	})

	describe("format", () => {
		it("trim", () => {
			const trim = type("format.trim")
			attest(trim("  foo  ")).equals("foo")
			attest(trim(5).toString()).snap("must be a string (was number)")
		})
		it("lowercase", () => {
			const lowercase = type("format.lowercase")
			attest(lowercase("FOO")).equals("foo")
			attest(lowercase(5).toString()).snap("must be a string (was number)")
		})
		it("uppercase", () => {
			const uppercase = type("format.uppercase")
			attest(uppercase("foo")).equals("FOO")
			attest(uppercase(5).toString()).snap("must be a string (was number)")
		})
	})

	describe("generics", () => {
		describe("record", () => {
			it("parsed", () => {
				const expected = type({ "[string]": "number" })

				const expression = type("Record<string, number>")
				attest(expression.json).equals(expected.json)
				attest<typeof expected.t>(expression.t)
			})

			it("invoked", () => {
				const expected = type({ "[string]": "number" })

				const t = ark.Record("string", "number")
				attest(t.json).equals(expected.json)
				attest<typeof expected.t>(t.t)
			})

			it("invoked validation error", () => {
				// @ts-expect-error
				attest(() => ark.Record("string", "string % 2")).throwsAndHasTypeError(
					writeIndivisibleMessage(intrinsic.string)
				)
			})

			it("invoked constraint error", () => {
				// @ts-expect-error
				attest(() => ark.Record("boolean", "number"))
					.throws(
						writeUnsatisfiedParameterConstraintMessage(
							"K",
							"string | symbol",
							"boolean"
						)
					)
					.type.errors(`ErrorType<"Invalid argument for K", [expected: Key]>`)
			})
		})

		describe("pick", () => {
			it("parsed", () => {
				const types = scope({
					from: {
						foo: "1",
						"bar?": "1",
						baz: "1",
						"quux?": "1"
					},
					actual: "Pick<from, 'foo' | 'bar'>",
					expected: {
						foo: "1",
						"bar?": "1"
					}
				}).export()

				attest<typeof types.expected.t>(types.actual.t)
				attest(types.actual.expression).equals(types.expected.expression)
			})

			it("chained", () => {
				const user = type({
					name: "string",
					"age?": "number",
					isAdmin: "boolean"
				})

				const basicUser = user.pick("name", "age")

				const expected = type({
					name: "string",
					"age?": "number"
				})

				attest<typeof expected.t>(basicUser.t)

				attest(basicUser.expression).equals(expected.expression)
			})

			it("invalid key", () => {
				const user = type({
					name: "string"
				})

				// @ts-expect-error
				attest(() => user.pick("length"))
					.throws(writeInvalidKeysMessage(user.expression, ["length"]))
					.type.errors.snap(
						'Argument of type \'"length"\' is not assignable to parameter of type \'"name" | cast<"name">\'.'
					)
			})

			it("non-structure", () => {
				// @ts-expect-error
				attest(() => type("string").pick("length"))
					.throws(writeNonStructuralOperandMessage("pick", "string"))
					.type.errors("Property 'pick' does not exist")
			})
		})

		describe("omit", () => {
			it("parsed", () => {
				const types = scope({
					from: {
						foo: "1",
						"bar?": "1",
						baz: "1",
						"quux?": "1"
					},
					actual: "Omit<from, 'foo' | 'bar'>",
					expected: {
						baz: "1",
						"quux?": "1"
					}
				}).export()

				attest<typeof types.expected.t>(types.actual.t)
				attest(types.actual.expression).equals(types.expected.expression)
			})

			it("chained", () => {
				const user = type({
					name: "string",
					"age?": "number",
					isAdmin: "boolean",
					"isActive?": "boolean"
				})

				const extras = user.omit("name", "age")

				const expected = type({
					isAdmin: "boolean",
					"isActive?": "boolean"
				})

				attest<typeof expected.t>(extras.t)

				attest(extras.expression).equals(expected.expression)
			})
		})

		describe("partial", () => {
			it("parsed", () => {
				const types = scope({
					user: {
						name: "string",
						"age?": "number"
					},
					actual: "Partial<user>",
					expected: {
						"name?": "string",
						"age?": "number"
					}
				}).export()

				attest<typeof types.expected.t>(types.actual.t)
				attest(types.actual.expression).equals(types.expected.expression)
			})

			it("chained", () => {
				const t = type({
					"[string]": "number",
					foo: "1",
					"bar?": "1"
				}).partial()

				attest<{
					// really this should just be number for the index signature, seems like a TS bug?
					[x: string]: number | undefined
					foo?: 1
					bar?: 1
				}>(t.t)

				attest(t.expression).snap("{ [string]: number, bar?: 1, foo?: 1 }")
			})
		})

		describe("required", () => {
			it("parsed", () => {
				const types = scope({
					user: {
						name: "string",
						"age?": "number"
					},
					actual: "Required<user>",
					expected: {
						name: "string",
						age: "number"
					}
				}).export()

				attest<typeof types.expected.t>(types.actual.t)
				attest(types.actual.expression).equals(types.expected.expression)
			})

			it("chained", () => {
				const t = type({
					"[string]": "number",
					foo: "1",
					"bar?": "1"
				}).required()

				attest<{
					[x: string]: number
					foo: 1
					bar: 1
				}>(t.t)

				attest(t.expression).snap("{ [string]: number, bar: 1, foo: 1 }")
			})
		})

		describe("extract", () => {
			it("parsed", () => {
				const types = scope({
					from: "0 | 1",
					actual: "Extract<from, 1>",
					expected: "1"
				}).export()

				attest<typeof types.expected.t>(types.actual.t)
				attest(types.actual.expression).equals(types.expected.expression)
			})

			it("chained", () => {
				const extracted = type("true | 0 | 'foo'").extract("boolean | number")

				const expected = type("true | 0")

				attest<typeof expected.t>(extracted.t)

				attest(extracted.expression).equals(expected.expression)
			})
		})

		describe("exclude", () => {
			it("parsed", () => {
				const types = scope({
					from: "0 | 1",
					actual: "Exclude<from, 1>",
					expected: "0"
				}).export()

				attest<typeof types.expected.t>(types.actual.t)
				attest(types.actual.expression).equals(types.expected.expression)
			})

			it("chained", () => {
				const extracted = type("true | 0 | 'foo'").exclude("string")

				const expected = type("true | 0")

				attest<typeof expected.t>(extracted.t)

				attest(extracted.expression).equals(expected.expression)
			})
		})

		describe("liftArray", () => {
			it("parsed", () => {
				const liftNumberArray = type("liftArray<number>")

				attest<(In: number | number[]) => Out<number[]>>(liftNumberArray.t)

				attest(liftNumberArray(5)).equals([5])
				attest(liftNumberArray([5])).equals([5])
				attest(liftNumberArray("five").toString()).snap(
					"must be a number or an array (was string)"
				)
				attest(liftNumberArray(["five"]).toString()).snap(
					"must be a number (was object) or [0] must be a number (was string)"
				)
			})

			it("invoked", () => {
				ark.liftArray({ data: "number" })
			})
		})

		describe("merged", () => {
			it("parsed", () => {
				const types = scope({
					base: {
						"foo?": "0",
						"bar?": "0"
					},
					merged: {
						bar: "1",
						"baz?": "1"
					},
					actual: "merge<base, merged>",
					expected: {
						"foo?": "0",
						bar: "1",
						"baz?": "1"
					}
				}).export()

				attest<typeof types.expected.t>(types.actual.t)
				attest(types.actual.expression).equals(types.expected.expression)
			})

			it("invoked", () => {
				const t = ark.merge(
					{
						"[string]": "number",
						foo: "0"
					},
					{
						"[string]": "0"
					}
				)

				const expected = type({
					"[string]": "0",
					foo: "0"
				})

				attest<typeof expected.t>(t.t)
				attest(t.expression).equals(expected.expression)
			})

			it("invoked", () => {
				const t = ark.merge(
					{
						"[string]": "number",
						foo: "0"
					},
					{
						"[string]": "0"
					}
				)

				const expected = type({
					"[string]": "0",
					foo: "0"
				})

				attest<typeof expected.t>(t.t)
				attest(t.expression).equals(expected.expression)
			})

			it("chained", () => {
				const t = ark.merge(
					{
						"[string]": "number",
						foo: "0"
					},
					{
						"[string]": "0"
					}
				)

				const expected = type({
					"[string]": "0",
					foo: "0"
				})

				attest<typeof expected.t>(t.t)
				attest(t.expression).equals(expected.expression)
			})
		})
	})
})
