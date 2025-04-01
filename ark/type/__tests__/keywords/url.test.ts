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

	it("parse", () => {
		const parseUrl = type("string.url.parse")

		attest(parseUrl).type.toString.snap("Type<(In: string) => To<URL>, {}>")
		attest(parseUrl("https://arktype.io")).instanceOf(URL)
		attest(parseUrl("arktype").toString()).snap(
			'must be a URL string (was "arktype")'
		)
	})
})
