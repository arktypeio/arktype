import { attest, contextualize } from "@ark/attest"
import { keywords, type } from "arktype"

contextualize(() => {
	it("alpha", () => {
		const Alpha = type("string.alpha")
		attest(Alpha("user")).snap("user")
		attest(Alpha("user123").toString()).snap(
			'must be only letters (was "user123")'
		)
	})

	it("alphanumeric", () => {
		const Alphanumeric = type("string.alphanumeric")
		attest(Alphanumeric("user123")).snap("user123")
		attest(Alphanumeric("user")).snap("user")
		attest(Alphanumeric("123")).snap("123")
		attest(Alphanumeric("abc@123").toString()).equals(
			'must be only letters and digits 0-9 (was "abc@123")'
		)
	})

	it("hex", () => {
		const Hex = type("string.hex")
		attest(Hex("1fA3").toString()).equals("1fA3")
		attest(Hex("0x1A3").toString()).equals(
			'must be hex characters only (was "0x1A3")'
		)
		attest(Hex("V29.yZA").toString()).equals(
			'must be hex characters only (was "V29.yZA")'
		)
		attest(Hex("fn5-").toString()).equals(
			'must be hex characters only (was "fn5-")'
		)
	})

	it("base64", () => {
		const B64 = type("string.base64")
		attest(B64("fn5+")).snap("fn5+")
		attest(B64("V29yZA==")).snap("V29yZA==")
		attest(B64("V29yZA").toString()).equals(
			'must be base64-encoded (was "V29yZA")'
		)
		attest(B64("V29.yZA").toString()).equals(
			'must be base64-encoded (was "V29.yZA")'
		)
		attest(B64("fn5-").toString()).equals('must be base64-encoded (was "fn5-")')

		const B64url = type("string.base64.url")
		attest(B64url("fn5-")).snap("fn5-")
		attest(B64url("V29yZA")).snap("V29yZA")
		attest(B64url("V29yZA==")).snap("V29yZA==")
		attest(B64url("V29yZA%3D%3D")).snap("V29yZA%3D%3D")
		attest(B64url("V29.yZA").toString()).equals(
			'must be base64url-encoded (was "V29.yZA")'
		)
		attest(B64url("fn5+").toString()).equals(
			'must be base64url-encoded (was "fn5+")'
		)
	})

	it("digits", () => {
		const Digits = type("string.digits")
		attest(Digits("123")).snap("123")
		attest(Digits("user123").toString()).equals(
			'must be only digits 0-9 (was "user123")'
		)
	})

	it("email", () => {
		const Email = type("string.email")
		attest(Email("shawn@mail.com")).snap("shawn@mail.com")
		attest(Email("shawn@email").toString()).equals(
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
			const Ip = type("string.ip")

			attest(Ip(validIPv4)).equals(validIPv4)

			attest(Ip(validIPv6)).equals(validIPv6)

			attest(Ip("192.168.1.256").toString()).snap(
				'must be an IP address (was "192.168.1.256")'
			)
			attest(Ip("2001:0db8:85a3:0000:0000:8a2e:0370:733g").toString()).snap(
				'must be an IP address (was "2001:0db8:85a3:0000:0000:8a2e:0370:733g")'
			)
		})

		it("version subtype", () => {
			const Uuidv4 = type("string.ip.v4")

			attest(Uuidv4(validIPv4)).equals(validIPv4)
			attest(Uuidv4("1234").toString()).snap(
				'must be an IPv4 address (was "1234")'
			)

			attest(keywords.string.ip.v6(validIPv6)).equals(validIPv6)

			attest(Uuidv4(validIPv6).toString()).snap(
				'must be an IPv4 address (was "2001:0db8:85a3:0000:0000:8a2e:0370:7334")'
			)

			attest(keywords.string.ip.v6(validIPv4).toString()).snap(
				'must be an IPv6 address (was "192.168.1.1")'
			)
		})
	})
})
