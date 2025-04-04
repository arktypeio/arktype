import { attest, contextualize } from "@ark/attest"
import { type } from "arktype"

contextualize(() => {
	it("trim", () => {
		const trim = type("string.trim")
		attest(trim("  foo  ")).equals("foo")
		attest(trim(5).toString()).snap("must be a string (was a number)")
	})

	it("lower", () => {
		const lower = type("string.lower")
		attest(lower("FOO")).equals("foo")
		attest(lower(5).toString()).snap("must be a string (was a number)")
	})

	it("lower.preformatted", () => {
		const Lower = type("string.lower.preformatted")
		attest(Lower("var")).snap("var")
		attest(Lower("newVar").toString()).snap(
			'must be only lowercase letters (was "newVar")'
		)
	})

	it("upper", () => {
		const upper = type("string.upper")
		attest(upper("foo")).equals("FOO")
		attest(upper(5).toString()).snap("must be a string (was a number)")
	})

	it("upper.preformatted", () => {
		const Upper = type("string.upper.preformatted")
		attest(Upper("VAR")).snap("VAR")
		attest(Upper("CONST_VAR").toString()).snap(
			'must be only uppercase letters (was "CONST_VAR")'
		)
		attest(Upper("myVar").toString()).snap(
			'must be only uppercase letters (was "myVar")'
		)
	})

	it("capitalize", () => {
		const capitalize = type("string.capitalize")
		attest(capitalize("foo")).equals("Foo")
		attest(capitalize(5).toString()).snap("must be a string (was a number)")
	})

	it("capitalize.preformatted", () => {
		const Capitalized = type("string.capitalize.preformatted")
		attest(Capitalized("Foo")).equals("Foo")
		attest(Capitalized("bar").toString()).snap(
			'must be capitalized (was "bar")'
		)
	})

	it("normalize", () => {
		const normalize = type("string.normalize")
		attest(normalize("\u00F1")).equals("ñ")
		attest(normalize("\u006E\u0303")).equals("ñ")
		attest(normalize("\u00F1")).equals(normalize("\u006E\u0303"))
		attest(normalize(5).toString()).snap("must be a string (was a number)")
	})
})
