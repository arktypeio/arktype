import { attest } from "@arktype/attest"
import { ark, scope, type } from "arktype"
import { suite, test } from "mocha"
import { writeUnresolvableMessage } from "../parser/string/shift/operand/unenclosed.js"

suite("type references", () => {
	test("shallow type reference", () => {
		const t = type(type("boolean"))
		attest<boolean>(t.infer)
	})

	test("bad shallow type reference", () => {
		attest(() => {
			// @ts-expect-error
			type(type("foolean"))
		}).throwsAndHasTypeError(writeUnresolvableMessage("foolean"))
	})

	test("deep type reference", () => {
		const t = type({ a: type("boolean") })
		attest<{ a: boolean }>(t.infer)
	})

	test("type reference in scope", () => {
		const a = type({ a: "string" })
		const $ = scope({ a })
		const types = $.export()
		attest(types.a.condition).equals(type({ a: "string" }).condition)
		attest(a.scope).is(ark)
		attest(types.a.scope).is($)
		attest<{ a: string }>(types.a.infer)
	})

	test("bad deep type reference", () => {
		attest(() => {
			// @ts-expect-error
			type({ a: type("goolean") })
		}).throwsAndHasTypeError(writeUnresolvableMessage("goolean"))
	})
})
