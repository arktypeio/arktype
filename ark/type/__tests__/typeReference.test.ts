import { attest } from "@arktype/attest"
import { ark, scope, type } from "arktype"

import { writeUnresolvableMessage } from "../parser/string/shift/operand/unenclosed.ts"

describe("type references", () => {
	it("shallow type reference", () => {
		const t = type(type("boolean"))
		attest<boolean>(t.infer)
	})

	it("bad shallow type reference", () => {
		attest(() => {
			// @ts-expect-error
			type(type("foolean"))
		}).throwsAndHasTypeError(writeUnresolvableMessage("foolean"))
	})

	it("deep type reference", () => {
		const t = type({ a: type("boolean") })
		attest<{ a: boolean }>(t.infer)
	})

	it("type reference in scope", () => {
		const a = type({ a: "string" })
		const $ = scope({ a })
		const types = $.export()
		attest(types.a.condition).equals(type({ a: "string" }).condition)
		attest(a.scope).is(ark)
		attest(types.a.scope).is($)
		attest<{ a: string }>(types.a.infer)
	})

	it("bad deep type reference", () => {
		attest(() => {
			// @ts-expect-error
			type({ a: type("goolean") })
		}).throwsAndHasTypeError(writeUnresolvableMessage("goolean"))
	})
})
