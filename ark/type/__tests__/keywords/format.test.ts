import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("trim", () => {
		const trim = type("string")
		attest(trim("  foo  ")).equals("foo")
		attest(trim(5).toString()).snap("must be a string (was number)")
	})

	it("toLower", () => {
		const toLower = type("string.toLower")
		attest(toLower("FOO")).equals("foo")
		attest(toLower(5).toString()).snap("must be a string (was number)")
	})

	it("toUpper", () => {
		const toUpper = type("string.to.upper")
		attest(toUpper("foo")).equals("FOO")
		attest(toUpper(5).toString()).snap("must be a string (was number)")
	})

	it("capitalize", () => {
		const capitalize = type("string.to.capitalized")
		attest(capitalize("foo")).equals("Foo")
		attest(capitalize(5).toString()).snap("must be a string (was number)")
	})

	it("normalize", () => {
		const normalize = type("string.to.normalized")
		attest(normalize("\u00F1")).equals("ñ")
		attest(normalize("\u006E\u0303")).equals("ñ")
		attest(normalize("\u00F1")).equals(normalize("\u006E\u0303"))
		attest(normalize(5).toString()).snap("must be a string (was number)")
	})
})
