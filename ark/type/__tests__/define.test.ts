import { attest, contextualize } from "@ark/attest"
import { writeUnresolvableMessage } from "@ark/schema"
import { define, scope, type } from "arktype"

contextualize(() => {
	it("ark", () => {
		const def = define({
			a: "string|number",
			b: ["boolean"]
		})
		attest<{ a: "string|number"; b: readonly ["boolean"] }>(def)
	})

	it("type attached", () => {
		const t = type.define({
			foo: "string"
		})

		attest<{ readonly foo: "string" }>(t).equals({ foo: "string" })

		// @ts-expect-error
		attest(() => type.define({ foo: "str" })).completions({ str: ["string"] })
	})

	it("ark error", () => {
		// currently is a no-op, so only has type error
		// @ts-expect-error
		attest(() => define({ a: "boolean|foo" })).type.errors(
			writeUnresolvableMessage("foo")
		)
	})

	it("custom scope", () => {
		const $ = scope({
			a: "string[]"
		})

		const ok = $.define(["a[]|boolean"])
		attest<readonly ["a[]|boolean"]>(ok)

		// @ts-expect-error
		attest(() => $.define({ not: "ok" })).type.errors(
			writeUnresolvableMessage("ok")
		)
	})
})
