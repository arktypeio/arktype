import { attest, contextualize } from "@ark/attest"
import { ark, type } from "arktype"

contextualize(() => {
	it("alpha", () => {
		const alpha = type("string.alpha")
		attest(alpha("user")).snap("user")
		attest(alpha("user123").toString()).equals(
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
		const email = type("email")
		attest(email("shawn@mail.com")).snap("shawn@mail.com")
		attest(email("shawn@email").toString()).equals(
			'must be a valid email (was "shawn@email")'
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
})
