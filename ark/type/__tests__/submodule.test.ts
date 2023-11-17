import { attest } from "@arktype/attest"
import { lazily } from "@arktype/util"
import { scope, type, type Ark, type Module, type Scope } from "arktype"
import {
	writeMissingSubmoduleAccessMessage,
	writeNonSubmoduleDotMessage,
	writeUnresolvableMessage
} from "../parser/string/shift/operand/unenclosed.ts"

const $ = lazily(() =>
	scope({
		a: "string",
		b: "sub.alias",
		sub: scope({ alias: "number" }).export()
	})
)

describe("submodules", () => {
	it("base", () => {
		const types = $.export()
		attest<
			Module<{
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
				$.scope({
					foo: "a",
					bar: "foo"
				}).export()
		})
		attest<
			Scope<{
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
	it("autocompletion", () => {
		const base = scope({ foo: "true" })
		// @ts-expect-error
		attest(() => scope({ base, reference: "base." }).export())
			.throws(writeUnresolvableMessage("base."))
			.type.errors("base.foo")
	})
	// TODO: private aliases
})
