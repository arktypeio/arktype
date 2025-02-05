import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("root", () => {
		const url = type("string.url")

		attest(url).type.toString.snap("Type<string, {}>")

		attest(url("https://arktype.io")).snap("https://arktype.io")
		attest(url("arktype").toString()).snap(
			'must be a URL string (was "arktype")'
		)
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
