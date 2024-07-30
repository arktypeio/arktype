import { attest, contextualize } from "@ark/attest"
import {
	writeMissingSubmoduleAccessMessage,
	writeNonSubmoduleDotMessage,
	writeUnresolvableMessage
} from "@ark/schema"
import { scope, type, type Module, type Scope } from "arktype"
import type { Out } from "../ast.js"

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

	it("can reference subaliases in expression", () => {
		const dateFrom = type("parse.date | Date")

		attest<Date | ((In: string) => Out<Date>)>(dateFrom.t)

		attest(dateFrom("05-21-1993")).instanceOf(Date)
		attest(dateFrom(new Date())).instanceOf(Date)

		attest(dateFrom("foobar").toString()).snap(
			'must be a valid date (was "foobar")'
		)
	})

	// TODO: private aliases
})
