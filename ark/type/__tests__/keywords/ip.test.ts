import { attest, contextualize } from "@ark/attest"
import { keywords, type } from "arktype"

const validIPv4 = "192.168.1.1"
const validIPv6 = "2001:0db8:85a3:0000:0000:8a2e:0370:7334"

contextualize(() => {
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

	it("v6 at the edges of its grammar", () => {
		const accepted = [
			"::",
			"::1",
			"1::",
			"1::2:3:4:5:6:7",
			"1:2:3:4:5:6:7::",
			"::ffff:192.0.2.1",
			"::2:3:4:5:6:192.0.2.1",
			"1:2:3:4:5::192.0.2.1",
			"1:2:3:4:5:6:192.0.2.1",
			"fe80::1%eth0"
		]
		const rejected = [
			"1:2:3:4:5:6:7:8:9",
			"1::2:3:4:5:6:7:8",
			"1:2:3:4:5:6:7::8",
			"1:2:3:4:5:6::192.0.2.1",
			"1:2:3:4:5:6:7:192.0.2.1",
			"1::2::3",
			":::",
			"::01.0.0.1",
			"::256.0.0.1",
			"::1%"
		]
		attest(accepted.filter(s => !keywords.string.ip.v6.allows(s))).equals([])
		attest(rejected.filter(s => keywords.string.ip.v6.allows(s))).equals([])
	})

	it("invalid ipv6 with empty segments", () => {
		const out = type.keywords.string.ip.v6("::%8:.-:.:")
		attest(out.toString()).snap('must be an IPv6 address (was "::%8:.-:.:")')
	})
})
