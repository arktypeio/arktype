import { attest, contextualize } from "@ark/attest"
import { anchoredSource, deanchoredSource } from "@ark/util"

contextualize(() => {
	it("anchors a simple source correctly", () => {
		const source = "abc"
		const anchored = anchoredSource(source)
		attest(anchored).equals("^(?:abc)$")
	})

	it("re-anchors an already anchored source correctly", () => {
		const source = "^abc$"
		const anchored = anchoredSource(source)
		attest(anchored).equals("^(?:^abc$)$")
	})

	it("anchors a source with union correctly", () => {
		const source = "abc|def"
		const anchored = anchoredSource(source)
		attest(anchored).equals("^(?:abc|def)$")
	})

	it("deanchors an anchored source correctly", () => {
		const source = "^(?:abc)$"
		const deanchored = deanchoredSource(source)
		attest(deanchored).equals("abc")
	})

	it("deanchors a complex anchored source with union correctly", () => {
		const source = "^(?:abc|def)$"
		const deanchored = deanchoredSource(source)
		attest(deanchored).equals("abc|def")
	})

	it("deanchors a re-anchored source correctly", () => {
		const source = "^(?:^abc$)$"
		const deanchored = deanchoredSource(source)
		attest(deanchored).equals("^abc$")
	})

	it("leaves a non-anchored source unchanged when deanchoring", () => {
		const source = "abc"
		const deanchored = deanchoredSource(source)
		attest(deanchored).equals("abc")
	})
})
