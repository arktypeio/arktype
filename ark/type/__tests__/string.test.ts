import { attest } from "@arktype/attest"
import { writeUnresolvableMessage } from "@arktype/schema"
import { type } from "arktype"
import { writeUnterminatedEnclosedMessage } from "../parser/string/shift/operand/enclosed.js"
import { writeExpressionExpectedMessage } from "../parser/string/shift/operand/unenclosed.js"

describe("string", () => {
	it("errors on empty string", () => {
		// @ts-expect-error
		attest(() => type("")).throws(writeExpressionExpectedMessage(""))
	})
	it("ignores whitespace between identifiers/operators", () => {
		const t = type(`  \n   string  |
        boolean    []   `)
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
		attest(() => type("str")).type.errors(
			`Argument of type '"str"' is not assignable to parameter of type '"string"'`
		)
	})
	it("shallow multi autocomplete", () => {
		// @ts-expect-error
		attest(() => type("s")).type.errors(`"string" | "symbol" | "semver"`)
	})
	it("post-operator autocomplete", () => {
		// @ts-expect-error
		attest(() => type("string|num")).type.errors(`"string|number"`)
	})
})
