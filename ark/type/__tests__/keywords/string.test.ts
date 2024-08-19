import { attest, contextualize } from "@ark/attest"
import { ark, type } from "arktype"
import type { Out, string, To } from "arktype/internal/ast.ts"

contextualize(() => {
	describe("validation", () => {
		it("alpha", () => {
			const alpha = type("string.alpha")
			attest(alpha("user")).snap("user")
			attest(alpha("user123").toString()).snap(
				'must be only letters (was "user123")'
			)
		})

		it("alphanumeric", () => {
			const alphanumeric = type("string.alphanumeric")
			attest(alphanumeric("user123")).snap("user123")
			attest(alphanumeric("user")).snap("user")
			attest(alphanumeric("123")).snap("123")
			attest(alphanumeric("abc@123").toString()).equals(
				'must be only letters and digits 0-9 (was "abc@123")'
			)
		})

		it("digits", () => {
			const digits = type("string.digits")
			attest(digits("123")).snap("123")
			attest(digits("user123").toString()).equals(
				'must be only digits 0-9 (was "user123")'
			)
		})

		it("lowercase", () => {
			const lowercase = type("string.lower")
			attest(lowercase("var")).snap("var")
			attest(lowercase("newVar").toString()).equals(
				'must be only lowercase letters (was "newVar")'
			)
		})

		it("uppercase", () => {
			const uppercase = type("string.upper")
			attest(uppercase("VAR")).snap("VAR")
			attest(uppercase("CONST_VAR").toString()).equals(
				'must be only uppercase letters (was "CONST_VAR")'
			)
			attest(uppercase("myVar").toString()).equals(
				'must be only uppercase letters (was "myVar")'
			)
		})

		it("email", () => {
			const email = type("string.email")
			attest(email("shawn@mail.com")).snap("shawn@mail.com")
			attest(email("shawn@email").toString()).equals(
				'must be a valid email (was "shawn@email")'
			)
		})

		it("credit card", () => {
			const validCC = "5489582921773376"
			attest(ark.string.creditCard(validCC)).equals(validCC)
			// Regex validation
			attest(ark.string.creditCard("0".repeat(16)).toString()).snap(
				'must be a valid credit card number (was "0000000000000000")'
			)
			// Luhn validation
			attest(ark.string.creditCard(validCC.slice(0, -1) + "0").toString()).snap(
				'must be a valid credit card number (was "5489582921773370")'
			)
		})

		it("semver", () => {
			attest(ark.string.semver("1.0.0")).snap("1.0.0")
			attest(ark.string.semver("-1.0.0").toString()).snap(
				'must be a valid semantic version (see https://semver.org/) (was "-1.0.0")'
			)
		})
	})

	describe("formatting", () => {
		it("trim", () => {
			const trim = type("string.trim")
			attest(trim("  foo  ")).equals("foo")
			attest(trim(5).toString()).snap("must be a string (was number)")
		})

		it("lowercase", () => {
			const lowercase = type("string.toLower")
			attest(lowercase("FOO")).equals("foo")
			attest(lowercase(5).toString()).snap("must be a string (was number)")
		})

		it("uppercase", () => {
			const uppercase = type("string.toUpper")
			attest(uppercase("foo")).equals("FOO")
			attest(uppercase(5).toString()).snap("must be a string (was number)")
		})

		it("capitalize", () => {
			const capitalize = type("string.capitalize")
			attest(capitalize("foo")).equals("Foo")
			attest(capitalize(5).toString()).snap("must be a string (was number)")
		})

		it("normalize", () => {
			const normalize = type("string.normalize")
			attest(normalize("\u00F1")).equals("ñ")
			attest(normalize("\u006E\u0303")).equals("ñ")
			attest(normalize("\u00F1")).equals(normalize("\u006E\u0303"))
			attest(normalize(5).toString()).snap("must be a string (was number)")
		})
	})

	describe("formatting", () => {
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
				email: "string.email",
				file: "object.File",
				tags: "liftArray<string>"
			})

			const parseUserForm = type("parse.formData").pipe(user)

			attest<
				(In: FormData) => To<{
					email: string.narrowed
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
				.snap(`email must be an email address (was "david")
	file must be an instance of File (was string)
	tags[2] must be a string (was object)`)
		})
	})

	describe("ip", () => {
		const validIPv4 = "192.168.1.1"
		const validIPv6 = "2001:0db8:85a3:0000:0000:8a2e:0370:7334"

		it("root", () => {
			const ip = type("string.ip")

			attest(ip(validIPv4)).equals(validIPv4)

			attest(ip(validIPv6)).equals(validIPv6)

			attest(ip("192.168.1.256").toString()).snap(
				'must be an IP address (was "192.168.1.256")'
			)
			attest(ip("2001:0db8:85a3:0000:0000:8a2e:0370:733g").toString()).snap(
				'must be an IP address (was "2001:0db8:85a3:0000:0000:8a2e:0370:733g")'
			)
		})

		it("version subtype", () => {
			const uuidv4 = type("string.ip.v4")

			attest(uuidv4(validIPv4)).equals(validIPv4)
			attest(uuidv4("1234").toString()).snap(
				'must be an IPv4 address (was "1234")'
			)

			attest(ark.string.ip.v6(validIPv6)).equals(validIPv6)

			attest(uuidv4(validIPv6).toString()).snap(
				'must be an IPv4 address (was "2001:0db8:85a3:0000:0000:8a2e:0370:7334")'
			)

			attest(ark.string.ip.v6(validIPv4).toString()).snap(
				'must be an IPv6 address (was "192.168.1.1")'
			)
		})
	})
})
