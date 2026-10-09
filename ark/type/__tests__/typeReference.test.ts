import { attest, contextualize } from "@ark/attest"
import { toJson, writeUnresolvableMessage } from "@ark/schema"
import { ark, scope, type } from "arktype"

contextualize(() => {
	it("shallow type reference", () => {
		const T = type(type("boolean"))
		attest<boolean>(T.infer)
	})

	it("bad shallow type reference", () => {
		attest(() => {
			// @ts-expect-error
			type(type("foolean"))
		}).throwsAndHasTypeError(writeUnresolvableMessage("foolean"))
	})

	it("deep type reference", () => {
		const T = type({ a: type("boolean") })
		attest<{ a: boolean }>(T.infer)
	})

	it("type reference in scope", () => {
		const A = type({ a: "string" })
		const $ = scope({ a: A })
		const types = $.export()
		attest(toJson(types.a)).equals(toJson(A))
		attest(A.$.internal).is(ark.internal)
		attest(types.a.$).is($)
		attest<{ a: string }>(types.a.infer)
	})

	it("bad deep type reference", () => {
		attest(() => {
			// @ts-expect-error
			type({ a: type("goolean") })
		}).throwsAndHasTypeError(writeUnresolvableMessage("goolean"))
	})
})
