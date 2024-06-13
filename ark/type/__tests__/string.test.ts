import { attest, contextualize } from "@arktype/attest"
import { writeUnresolvableMessage } from "@arktype/schema"
import { type } from "arktype"
import { writeUnterminatedEnclosedMessage } from "../parser/string/shift/operand/enclosed.js"
import { writeExpressionExpectedMessage } from "../parser/string/shift/operand/unenclosed.js"

contextualize(() => {
	it("errors on empty string", () => {
		// @ts-expect-error
		attest(() => type("")).throws(writeExpressionExpectedMessage(""))
	})

	it("ignores whitespace between identifiers/operators", () => {
		const t = type(`  \n   string  |
    \tboolean    []   `)
		attest<string | boolean[]>(t.infer)
		attest(t.json).equals(type("string|boolean[]").json)
	})

	it("errors on bad whitespace", () => {
		attest(() =>
			// @ts-expect-error
			type("string | boo lean[]")
		)
			.throws(writeUnresolvableMessage("boo"))
			.type.errors("string | boolean")
	})

	it("unterminated string", () => {
		// @ts-expect-error
		attest(() => type("'bob")).throwsAndHasTypeError(
			writeUnterminatedEnclosedMessage("bob", "'")
		)
	})

	it("shallow single autocomplete", () => {
		// @ts-expect-error
		attest(() => type("str")).completions({ str: ["string"] })
	})

	it("shallow multi autocomplete", () => {
		// @ts-expect-error
		attest(() => type("s")).completions({ s: ["semver", "string", "symbol"] })
	})

	it("post-operator autocomplete", () => {
		// @ts-expect-error
		attest(() => type("string|num")).completions({
			"string|num": ["string|number"]
		})
	})

	it("post-operator autocomplete with spaces", () => {
		// @ts-expect-error
		attest(() => type("  string  |  num")).completions({
			"  string  |  num": ["  string  |  number"]
		})
	})
})
