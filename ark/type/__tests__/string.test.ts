import { attest, contextualize } from "@ark/attest"
import { writeUnresolvableMessage } from "@ark/schema"
import { type } from "arktype"
import { writeUnterminatedEnclosedMessage } from "arktype/internal/parser/shift/operand/enclosed.ts"
import { writeExpressionExpectedMessage } from "arktype/internal/parser/shift/operand/unenclosed.ts"

contextualize(() => {
	it("errors on empty string", () => {
		// @ts-expect-error
		attest(() => type("")).throws(writeExpressionExpectedMessage(""))
	})

	it("ignores whitespace between identifiers/operators", () => {
		const T = type(`  \n   string  |
           number
    \t|boolean    []   `)
		attest<string | number | boolean[]>(T.infer)
		attest(T.json).equals(type("string|number|boolean[]").json)
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
		attest(() => type("s")).completions({ s: ["string", "symbol"] })
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
