import { attest, contextualize } from "@ark/attest"
import { keywords, type } from "arktype"

contextualize(() => {
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

	it("hex", () => {
		const hex = type("string.hex")
		attest(hex("1fA3").toString()).equals("1fA3")
		attest(hex("0x1A3").toString()).equals(
			'must be hex (was "0x1A3")'
		)
		attest(hex("V29.yZA").toString()).equals(
			'must be hex (was "V29.yZA")'
		)
		attest(hex("fn5-").toString()).equals('must be hex (was "fn5-")')
	})

	it("base64", () => {
		const b64 = type("string.base64")
		attest(b64("fn5+")).snap("fn5+")
		attest(b64("V29yZA==")).snap("V29yZA==")
		attest(b64("V29yZA").toString()).equals(
			'must be base64-encoded (was "V29yZA")'
		)
		attest(b64("V29.yZA").toString()).equals(
			'must be base64-encoded (was "V29.yZA")'
		)
		attest(b64("fn5-").toString()).equals('must be base64-encoded (was "fn5-")')

		const b64url = type("string.base64.url")
		attest(b64url("fn5-")).snap("fn5-")
		attest(b64url("V29yZA")).snap("V29yZA")
		attest(b64url("V29yZA==")).snap("V29yZA==")
		attest(b64url("V29yZA%3D%3D")).snap("V29yZA%3D%3D")
		attest(b64url("V29.yZA").toString()).equals(
			'must be base64url-encoded (was "V29.yZA")'
		)
		attest(b64url("fn5+").toString()).equals(
			'must be base64url-encoded (was "fn5+")'
		)
	})

	it("digits", () => {
		const digits = type("string.digits")
		attest(digits("123")).snap("123")
		attest(digits("user123").toString()).equals(
			'must be only digits 0-9 (was "user123")'
		)
	})

	it("email", () => {
		const email = type("string.email")
		attest(email("shawn@mail.com")).snap("shawn@mail.com")
		attest(email("shawn@email").toString()).equals(
			'must be an email address (was "shawn@email")'
		)
	})

	it("credit card", () => {
		const validCC = "5489582921773376"
		attest(keywords.string.creditCard(validCC)).equals(validCC)
		// Regex validation
		attest(keywords.string.creditCard("0".repeat(16)).toString()).snap(
			'must be a credit card number (was "0000000000000000")'
		)
		// Luhn validation
		attest(
			keywords.string.creditCard(validCC.slice(0, -1) + "0").toString()
		).snap('must be a credit card number (was "5489582921773370")')
	})

	it("semver", () => {
		attest(keywords.string.semver("1.0.0")).snap("1.0.0")
		attest(keywords.string.semver("-1.0.0").toString()).snap(
			'must be a semantic version (see https://semver.org/) (was "-1.0.0")'
		)
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

			attest(keywords.string.ip.v6(validIPv6)).equals(validIPv6)

			attest(uuidv4(validIPv6).toString()).snap(
				'must be an IPv4 address (was "2001:0db8:85a3:0000:0000:8a2e:0370:7334")'
			)

			attest(keywords.string.ip.v6(validIPv4).toString()).snap(
				'must be an IPv6 address (was "192.168.1.1")'
			)
		})
	})
})
