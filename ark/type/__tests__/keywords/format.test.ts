import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("trim", () => {
		const trim = type("string")
		attest(trim("  foo  ")).equals("foo")
		attest(trim(5).toString()).snap("must be a string (was number)")
	})

	it("lower", () => {
		const lower = type("string.lower")
		attest(lower("FOO")).equals("foo")
		attest(lower(5).toString()).snap("must be a string (was number)")
	})

	it("upper", () => {
		const upper = type("string.upper")
		attest(upper("foo")).equals("FOO")
		attest(upper(5).toString()).snap("must be a string (was number)")
	})

	it("capitalize", () => {
		const capitalize = type("string.capitalize")
		attest(capitalize("foo")).equals("Foo")
		attest(capitalize(5).toString()).snap("must be a string (was number)")
	})

	it("normalize", () => {
		const normalize = type("string.normalize")
		attest(normalize("\u00F1")).equals("ñ")
		attest(normalize("\u006E\u0303")).equals("ñ")
		attest(normalize("\u00F1")).equals(normalize("\u006E\u0303"))
		attest(normalize(5).toString()).snap("must be a string (was number)")
	})
})
