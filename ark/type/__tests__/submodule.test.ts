import { attest, contextualize } from "@arktype/attest"
import {
	writeMissingSubmoduleAccessMessage,
	writeNonSubmoduleDotMessage,
	writeUnresolvableMessage
} from "@arktype/schema"
import { type Module, type Scope, scope, type } from "arktype"

contextualize(() => {
	const $ = scope({
		a: "string",
		b: "sub.alias",
		sub: scope({ alias: "number" }).export()
	})

	it("base", () => {
		const types = $.export()
		attest<
			Module<{
				a: string
				b: number
				sub: Module<{
					alias: number
				}>
			}>
		>(types)

		attest<number>(types.sub.alias.infer)
		const expected = type("number").json
		attest(types.sub.alias.json).is(expected)
		attest(types.b.json).is(expected)
	})

	it("non-submodule dot access", () => {
		// @ts-expect-error
		attest(() => $.type("b.foo")).throwsAndHasTypeError(
			writeNonSubmoduleDotMessage("b")
		)
	})

	it("thunk submodule", () => {
		const $ = scope({
			a: "string",
			c: "a",
			sub: () =>
				scope({
					...$.import("a", "c"),
					foo: "a",
					bar: "foo"
				}).export()
		})
		attest<
			Scope<{
				a: string
				c: string
				sub: Module<{
					foo: string
					bar: string
				}>
			}>
		>($)
	})

	it("no alias reference", () => {
		// @ts-expect-error
		attest(() => $.type("sub")).throwsAndHasTypeError(
			writeMissingSubmoduleAccessMessage("sub")
		)
	})

	it("bad alias reference", () => {
		// @ts-expect-error
		attest(() => $.type("sub.marine")).throwsAndHasTypeError(
			writeUnresolvableMessage("sub.marine")
		)
	})

	it("completions", () => {
		const base = scope({ foo: "true" }).export()
		// @ts-expect-error
		attest(() => scope({ base, reference: "base." }).export())
			.throws(writeUnresolvableMessage("base."))
			.type.completions({ "base.": ["base.foo"] })
	})
	// TODO: private aliases
})
