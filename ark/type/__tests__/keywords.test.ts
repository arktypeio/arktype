import { attest, contextualize } from "@arktype/attest"
import { rawSchema } from "@arktype/schema"
import { ark, type } from "arktype"

contextualize(
	"jsObjects",
	() => {
		it("Function", () => {
			// should not be treated as a morph
			attest<Function>(type("Function").infer)
		})

		it("Date", () => {
			// should not expand built-in classes
			attest(type("Date").infer).type.toString.snap("Date")
		})
	},
	"tsKeywords",
	() => {
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
			const expected = rawSchema([{ unit: false }, { unit: true }])
			// should be simplified to simple checks for true and false literals
			attest(boolean.json).equals(expected.json)
		})

		it("never", () => {
			const never = type("never")
			attest<never>(never.infer)
			const expected = rawSchema([])
			// should be equivalent to a zero-branch union
			attest(never.json).equals(expected.json)
		})

		it("never in union", () => {
			const t = type("string|never")
			attest<string>(t.infer)
			attest(t.json).equals(ark.string.json)
		})

		it("unknown", () => {
			const expected = rawSchema({})
			// should be equivalent to an unconstrained predicate
			attest(type("unknown").json).equals(expected.json)
		})

		it("void", () => {
			const t = type("void")
			attest<void>(t.infer)
			const expected = type("undefined")
			//should be treated as undefined at runtime
			attest(t.json).equals(expected.json)
		})
	},
	"validation",
	() => {
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
	},
	"parse",
	() => {
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
	},
	"format",
	() => {
		it("trim", () => {
			const trim = type("format.trim")
			attest(trim("  foo  ")).equals("foo")
			attest(trim(5).toString()).snap("must be a string (was number)")
		})
	}
)
