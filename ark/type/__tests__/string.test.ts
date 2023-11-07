import { attest } from "@arktype/attest"
import { type } from "arktype"
import { suite, test } from "mocha"
import { writeUnterminatedEnclosedMessage } from "../parser/string/shift/operand/enclosed.js"
import {
	writeExpressionExpectedMessage,
	writeUnresolvableMessage
} from "../parser/string/shift/operand/unenclosed.js"

suite("string", () => {
	test("errors on empty string", () => {
		// @ts-expect-error
		attest(() => type("")).throws(writeExpressionExpectedMessage(""))
	})
	test("ignores whitespace between identifiers/operators", () => {
		const t = type(`  \n   string  |
        boolean    []   `)
		attest<string | boolean[]>(t.infer)
		attest(t.condition).equals(type("string|boolean[]").condition)
	})
	test("errors on bad whitespace", () => {
		attest(() =>
			// @ts-expect-error
			type("string | boo lean[]")
		)
			.throws(writeUnresolvableMessage("boo"))
			.type.errors("string | boolean")
	})
	test("unterminated string", () => {
		// @ts-expect-error
		attest(() => type("'bob")).throwsAndHasTypeError(
			writeUnterminatedEnclosedMessage("bob", "'")
		)
	})
	test("shallow single autocomplete", () => {
		// @ts-expect-error
		attest(() => type("str")).type.errors(
			`Argument of type '"str"' is not assignable to parameter of type '"string"'`
		)
	})
	test("shallow multi autocomplete", () => {
		// @ts-expect-error
		attest(() => type("s")).type.errors(`"string" | "symbol" | "semver"`)
	})
	test("post-operator autocomplete", () => {
		// @ts-expect-error
		attest(() => type("string|num")).type.errors(`"string|number"`)
	})
})
