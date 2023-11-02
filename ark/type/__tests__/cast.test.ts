import { attest } from "@arktype/attest"
import type { Constructor } from "@arktype/util"
import { type } from "arktype"
import type { Type } from "arktype"
import { suite, test } from "mocha"

suite("cast", () => {
	test("primitive", () => {
		attest(type("string" as type.cast<"foo">)).typed as Type<"foo">
	})
	test("object", () => {
		// definitions that are cast can't be validated
		attest(type({ a: "string" } as type.cast<{ a: "foo" }>)).typed as Type<{
			a: "foo"
		}>
	})
	test("primitive to object", () => {
		attest(type("string" as type.cast<{ a: "foo" }>)).typed as Type<{
			a: "foo"
		}>
	})
	test("object to primitive", () => {
		attest(type({ a: "string" } as type.cast<"foo">)).typed as Type<"foo">
	})
	test("infer function", () => {
		type F = () => boolean
		const constructable = type({} as type.cast<F>)
		attest(constructable).typed as Type<F>
		attest(constructable.infer).typed as F
		attest(constructable.inferIn).typed as F
	})
	test("infer constructable", () => {
		const constructable = type({} as type.cast<Constructor>)
		attest(constructable).typed as Type<Constructor>
		attest(constructable.infer).typed as Constructor
		attest(constructable.inferIn).typed as Constructor
	})
})
