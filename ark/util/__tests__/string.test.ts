import { attest, contextualize } from "@ark/attest"
import {
	anchoredSource,
	capitalize,
	deanchoredSource,
	uncapitalize
} from "@ark/util"

contextualize(() => {
	it("capitalize", () => {
		attest(capitalize("foo")).equals("Foo")
		attest(capitalize("")).equals("")
	})

	it("uncapitalize", () => {
		attest(uncapitalize("Foo")).equals("foo")
		attest(uncapitalize("")).equals("")
	})

	it("anchoredSource", () => {
		attest(anchoredSource("abc|def")).equals("^(?:abc|def)$")
	})

	it("deanchoredSource unwraps only the outer group", () => {
		attest(deanchoredSource("^(?:^abc$)$")).equals("^abc$")
	})

	it("deanchoredSource strips bare anchors", () => {
		attest(deanchoredSource(/^abc$/)).equals("abc")
		attest(deanchoredSource("abc")).equals("abc")
	})
})
