import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("root", () => {
		const Url = type("string.url")

		attest(Url).type.toString.snap("Type<string, {}>")

		attest(Url("https://arktype.io")).snap("https://arktype.io")
		attest(Url("arktype").toString()).snap(
			'must be a URL string (was "arktype")'
		)
	})

	it("rejects what the parser rejects, even shaped like a plain URL", () => {
		const Url = type("string.url")
		attest(Url.allows("https://xn--a.com")).equals(false)
		attest(Url.allows("https://a.123")).equals(false)
		attest(Url.allows("https://a.0x1f")).equals(false)
		attest(Url.allows("http://localhost:65536")).equals(false)
		attest(Url.allows("HTTP://my-site.example.com:3000/a?b#c")).equals(true)
	})

	it("parse", () => {
		const parseUrl = type("string.url.parse")

		attest(parseUrl).type.toString.snap("Type<(In: string) => To<URL>, {}>")
		attest(parseUrl("https://arktype.io")).instanceOf(URL)
		attest(parseUrl("arktype").toString()).snap(
			'must be a URL string (was "arktype")'
		)
	})
})
