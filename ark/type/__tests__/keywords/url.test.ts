import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("root", () => {
		const Url = type("string.url")

		attest(Url).type.toString.snap("Type<string, {}>")

		attest(Url("https://arktype.io")).snap("https://arktype.io")
		attest(Url("arktype").toString()).snap("must be a URL string")
	})

	it("rejects what the parser rejects, even shaped like a plain URL", () => {
		const Url = type("string.url")
		// whether a punycode label must decode differs between Node versions
		attest(Url.allows("https://xn--a.com")).equals(
			URL.canParse("https://xn--a.com")
		)
		attest(Url.allows("https://a.123")).equals(false)
		attest(Url.allows("https://a.0x1f")).equals(false)
		attest(Url.allows("http://localhost:65536")).equals(false)
		attest(Url.allows("HTTP://my-site.example.com:3000/a?b#c")).equals(true)
	})

	it("accepts other URLs the parser accepts", () => {
		const Url = type("string.url")
		attest(Url.allows("mailto:ada@example.com")).equals(true)
		attest(Url.allows(" https://127.0.0.1:8080")).equals(true)
	})

	it("accepts whatever follows a plain host, as the parser does", () => {
		const Url = type("string.url")
		const urls = [
			"https://a.com/ b",
			"https://a.com/\u00e9?\u00fc#\u{1f600}",
			"https://a.com/\ud800",
			"https://a.com?%zz",
			"http://a.com:80#\\",
			"https://a.com/\n"
		]
		attest(urls.filter(url => !URL.canParse(url))).equals([])
		attest(urls.filter(url => !Url.allows(url))).equals([])
	})

	it("http rejects a space or control character the parser would repair", () => {
		const HttpUrl = type("string.url.http")
		const urls = [
			"http://a.com ",
			" http://a.com",
			"http://a.com\n",
			"https://a.com/a b",
			"https://a.com/\tb",
			"https://a.com/\x7f"
		]
		attest(urls.filter(url => HttpUrl.allows(url))).equals([])
		attest(HttpUrl("http://a.com ").toString()).snap(
			"must be an HTTP or HTTPS URL"
		)
		// as other characters outside ASCII, which it percent-encodes
		attest(HttpUrl.allows("https://a.com/\u00e9\u00a0")).equals(true)
		attest(HttpUrl.allows("HTTPS://a.com/a?b=c#d")).equals(true)
		attest(HttpUrl.allows("mailto:ada@example.com")).equals(false)
	})

	it("parse", () => {
		const parseUrl = type("string.url.parse")

		attest(parseUrl).type.toString.snap("Type<(In: string) => To<URL>, {}>")
		attest(parseUrl("https://arktype.io")).instanceOf(URL)
		attest(parseUrl("arktype").toString()).snap("must be a URL string")
	})
})
