import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("trim", () => {
		const trim = type("format.trim")
		attest(trim("  foo  ")).equals("foo")
		attest(trim(5).toString()).snap("must be a string (was number)")
	})

	it("lowercase", () => {
		const lowercase = type("format.lowercase")
		attest(lowercase("FOO")).equals("foo")
		attest(lowercase(5).toString()).snap("must be a string (was number)")
	})

	it("uppercase", () => {
		const uppercase = type("format.uppercase")
		attest(uppercase("foo")).equals("FOO")
		attest(uppercase(5).toString()).snap("must be a string (was number)")
	})

	it("capitalize", () => {
		const capitalize = type("format.capitalize")
		attest(capitalize("foo")).equals("Foo")
		attest(capitalize(5).toString()).snap("must be a string (was number)")
	})

	it("normalize", () => {
		const normalize = type("format.normalize")
		attest(normalize("\u00F1")).equals("ñ")
		attest(normalize("\u006E\u0303")).equals("ñ")
		attest(normalize("\u00F1")).equals(normalize("\u006E\u0303"))
		attest(normalize(5).toString()).snap("must be a string (was number)")
	})
})
