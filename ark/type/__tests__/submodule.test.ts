import { attest } from "@arktype/attest"
import { node } from "@arktype/schema"
import { lazily } from "@arktype/util"
import type { Ark, Module, Scope } from "arktype"
import { scope, type } from "arktype"
import { suite, test } from "mocha"
import {
	writeMissingSubmoduleAccessMessage,
	writeNonSubmoduleDotMessage,
	writeUnresolvableMessage
} from "../parser/string/shift/operand/unenclosed.js"

const $ = lazily(() =>
	scope({
		a: "string",
		b: "sub.alias",
		sub: scope({ alias: "number" }).export()
	})
)

suite("submodules", () => {
	test("base", () => {
		const types = $.export()
		attest(types).typed as Module<{
			exports: {
				a: string
				b: number
				sub: Module<{
					exports: {
						alias: number
					}
					locals: {}
					ambient: Ark
				}>
			}
			locals: {}
			ambient: Ark
		}>
		attest(types.sub.alias.infer).typed as number
		const expected = type("number").condition
		attest(types.sub.alias.condition).is(expected)
		attest(types.b.condition).is(expected)
	})
	test("non-submodule dot access", () => {
		// @ts-expect-error
		attest(() => $.type("b.foo")).throwsAndHasTypeError(
			writeNonSubmoduleDotMessage("b")
		)
	})
	test("thunk submodule", () => {
		const $ = scope({
			a: "string",
			c: "a",
			sub: () =>
				$.scope({
					foo: "a",
					bar: "foo"
				}).export()
		})
		attest($).typed as Scope<{
			exports: {
				a: string
				c: string
				sub: Module<{
					exports: {
						foo: string
						bar: string
					}
					locals: {}
					ambient: Ark
				}>
			}
			locals: {}
			ambient: Ark
		}>
	})
	test("no alias reference", () => {
		// @ts-expect-error
		attest(() => $.type("sub")).throwsAndHasTypeError(
			writeMissingSubmoduleAccessMessage("sub")
		)
	})
	test("bad alias reference", () => {
		// @ts-expect-error
		attest(() => $.type("sub.marine")).throwsAndHasTypeError(
			writeUnresolvableMessage("sub.marine")
		)
	})
	test("autocompletion", () => {
		const base = scope({ foo: "true" })
		// @ts-expect-error
		attest(() => scope({ base, reference: "base." }).export())
			.throws(writeUnresolvableMessage("base."))
			.type.errors("base.foo")
	})
	// TODO: private aliases
})
